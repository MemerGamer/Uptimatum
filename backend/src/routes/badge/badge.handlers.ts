import { OpenAPIHono } from "@hono/zod-openapi";
import { db, client } from "../../db/index.js";
import { pages, endpoints, checks } from "../../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { generateBadge } from "../../badge.js";
import { getBadgeRoute } from "./badge.routes.js";

export function registerBadgeHandlers(app: OpenAPIHono) {
  app.openapi(getBadgeRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (!page) {
      return c.text("Not found", 404);
    }

    const pageEndpoints = await db
      .select()
      .from(endpoints)
      .where(and(eq(endpoints.pageId, page.id), eq(endpoints.active, true)));

    if (pageEndpoints.length === 0) {
      return c.body(generateBadge("up", 100), 200, {
        "Content-Type": "image/svg+xml",
      });
    }

    const endpointIds = pageEndpoints.map((e) => e.id);

    // Get latest status for each endpoint
    const latestChecks = await Promise.all(
      endpointIds.map(async (id) => {
        const [latest] = await db
          .select()
          .from(checks)
          .where(eq(checks.endpointId, id))
          .orderBy(desc(checks.checkedAt))
          .limit(1);
        return latest;
      })
    );

    const anyDown = latestChecks.some((check) => check?.status === "down");
    const status = anyDown ? "down" : "up";

    // Calculate uptime using raw SQL (needed for complex aggregation)
    const [uptimeStats] = await client`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'up')::int as up
      FROM checks
      WHERE endpoint_id = ANY(${endpointIds})
        AND checked_at > NOW() - INTERVAL '24 hours'
    `;

    const pct =
      uptimeStats.total > 0 ? (uptimeStats.up / uptimeStats.total) * 100 : 100;

    return c.body(generateBadge(status, pct), 200, {
      "Content-Type": "image/svg+xml",
    });
  });
}
