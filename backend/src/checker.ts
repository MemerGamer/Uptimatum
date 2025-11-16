import cron from "node-cron";
import { db, client } from "./db/index.js";
import { endpoints, checks, type Endpoint } from "./db/schema.js";
import { eq, lt } from "drizzle-orm";
import { env } from "./env.js";
import { logger } from "./logger.js";

// Minimum seconds between updates to prevent too frequent writes
const UPDATE_THRESHOLD_SECONDS = 5;

async function checkEndpoint(endpoint: Endpoint) {
  const start = Date.now();
  let status: "up" | "down" | "degraded";
  let responseTime: number;
  let statusCode: number | null = null;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      endpoint.timeout * 1000
    );

    const res = await fetch(endpoint.url, {
      method: endpoint.method,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseTime = Date.now() - start;
    status = res.ok ? "up" : "degraded";
    statusCode = res.status;
  } catch (err: any) {
    responseTime = Date.now() - start;
    status = "down";
    error = err.message;
  }

  // Use transaction with row-level locking to prevent race conditions
  // Using postgres client transaction for proper row-level locking support
  await client.begin(async (sqlTransaction) => {
    // Get the latest check for this endpoint with row-level lock
    // FOR UPDATE SKIP LOCKED allows other transactions to proceed if this row is locked
    const latestCheckResult = await sqlTransaction`
      SELECT id, endpoint_id, status, response_time, status_code, error, checked_at
      FROM checks
      WHERE endpoint_id = ${endpoint.id}
      ORDER BY checked_at DESC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    const latestCheck =
      latestCheckResult.length > 0
        ? {
            id: latestCheckResult[0].id as number,
            endpointId: latestCheckResult[0].endpoint_id as number,
            status: latestCheckResult[0].status as "up" | "down" | "degraded",
            responseTime: latestCheckResult[0].response_time as number | null,
            statusCode: latestCheckResult[0].status_code as number | null,
            error: latestCheckResult[0].error as string | null,
            checkedAt: latestCheckResult[0].checked_at as Date,
          }
        : null;

    const now = new Date();
    const shouldInsertNewRow =
      !latestCheck || // No previous check
      latestCheck.status !== status || // Status changed
      (latestCheck.status === status &&
        // Status same but last update was more than threshold ago
        (now.getTime() - latestCheck.checkedAt.getTime()) / 1000 >
          UPDATE_THRESHOLD_SECONDS);

    if (shouldInsertNewRow) {
      // Insert new row if status changed or threshold passed
      await sqlTransaction`
        INSERT INTO checks (endpoint_id, status, response_time, status_code, error, checked_at)
        VALUES (${endpoint.id}, ${status}, ${responseTime}, ${statusCode}, ${error}, ${now})
      `;

      logger.info(
        {
          endpoint: endpoint.name,
          responseTime,
          status,
          action: latestCheck ? "status_changed" : "first_check",
        },
        `✓ ${endpoint.name}: ${responseTime}ms (${status})`
      );
    } else {
      // Update timestamp of existing row if status unchanged and within threshold
      // This prevents duplicate writes from parallel instances
      await sqlTransaction`
        UPDATE checks
        SET checked_at = ${now},
            response_time = ${responseTime},
            status_code = ${statusCode},
            error = ${error}
        WHERE id = ${latestCheck.id}
      `;

      logger.debug(
        {
          endpoint: endpoint.name,
          responseTime,
          status,
          action: "timestamp_updated",
        },
        `✓ ${endpoint.name}: ${responseTime}ms (${status}, updated)`
      );
    }
  });

  if (status === "down") {
    logger.warn(
      { endpoint: endpoint.name, error },
      `✗ ${endpoint.name}: ${error}`
    );
  }
}

async function cleanupOldChecks() {
  try {
    const retentionDays = parseInt(env.CHECK_RETENTION_DAYS) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await db.delete(checks).where(lt(checks.checkedAt, cutoffDate));

    logger.info({ retentionDays }, `🧹 Cleaned up checks older than ${retentionDays} days`);
  } catch (error) {
    logger.error({ error }, "❌ Error cleaning up old checks");
  }
}

export async function startChecker() {
  logger.info("🔍 Health checker started");

  // Schedule health checks every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    const activeEndpoints = await db
      .select()
      .from(endpoints)
      .where(eq(endpoints.active, true));

    await Promise.all(activeEndpoints.map(checkEndpoint));
  });

  // Schedule cleanup job to run daily at 2 AM
  cron.schedule("0 2 * * *", async () => {
    await cleanupOldChecks();
  });

  // Run immediately
  const activeEndpoints = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.active, true));

  await Promise.all(activeEndpoints.map(checkEndpoint));
}
