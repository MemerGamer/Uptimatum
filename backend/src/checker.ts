import cron from "node-cron";
import { db } from "./db/index.js";
import { endpoints, checks, type Endpoint } from "./db/schema.js";
import { eq, lt } from "drizzle-orm";
import { env } from "./env.js";
import { logger } from "./logger.js";

async function checkEndpoint(endpoint: Endpoint) {
  const start = Date.now();
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
    const responseTime = Date.now() - start;

    await db.insert(checks).values({
      endpointId: endpoint.id,
      status: res.ok ? "up" : "degraded",
      responseTime,
      statusCode: res.status,
    });

    logger.info(
      { endpoint: endpoint.name, responseTime, status: res.ok ? "up" : "degraded" },
      `✓ ${endpoint.name}: ${responseTime}ms`
    );
  } catch (error: any) {
    await db.insert(checks).values({
      endpointId: endpoint.id,
      status: "down",
      responseTime: Date.now() - start,
      error: error.message,
    });
    logger.warn(
      { endpoint: endpoint.name, error: error.message },
      `✗ ${endpoint.name}: ${error.message}`
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
