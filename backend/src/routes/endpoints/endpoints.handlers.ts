import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../../db/index.js";
import { endpoints, checks } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
  getEndpointHistoryRoute,
  createEndpointRoute,
  deleteEndpointRoute,
} from "./endpoints.routes.js";

export function registerEndpointsHandlers(app: OpenAPIHono) {
  app.openapi(getEndpointHistoryRoute, async (c) => {
    const { id } = c.req.valid("param");
    const endpointId = parseInt(id);

    const history = await db
      .select()
      .from(checks)
      .where(eq(checks.endpointId, endpointId))
      .orderBy(desc(checks.checkedAt))
      .limit(100);

    return c.json(history);
  });

  app.openapi(createEndpointRoute, async (c) => {
    const body = c.req.valid("json");
    const [newEndpoint] = await db
      .insert(endpoints)
      .values({
        pageId: body.page_id,
        name: body.name,
        url: body.url,
        method: body.method,
        interval: body.interval,
        timeout: body.timeout,
      })
      .returning();

    return c.json(newEndpoint, 201);
  });

  app.openapi(deleteEndpointRoute, async (c) => {
    const { id } = c.req.valid("param");
    const endpointId = parseInt(id);

    await db.delete(endpoints).where(eq(endpoints.id, endpointId));
    return c.json({ success: true });
  });
}
