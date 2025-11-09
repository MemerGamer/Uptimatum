import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../../db/index.js";
import { pages, endpoints, checks, type Endpoint } from "../../db/schema.js";
import { eq, desc, and, gte, inArray } from "drizzle-orm";
import {
  listPagesRoute,
  getPageBySlugRoute,
  createPageRoute,
  updatePageRoute,
  getPageTimelineRoute,
} from "./pages.routes.js";

export function registerPagesHandlers(app: OpenAPIHono) {
  app.openapi(listPagesRoute, async (c) => {
    const allPages = await db.select().from(pages);
    return c.json(allPages);
  });

  app.openapi(getPageBySlugRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (!page) {
      return c.json({ error: "Not found" } as const, 404);
    }

    const pageEndpoints = await db
      .select()
      .from(endpoints)
      .where(and(eq(endpoints.pageId, page.id), eq(endpoints.active, true)));

    const data = await Promise.all(
      pageEndpoints.map(async (ep: Endpoint) => {
        const [latest] = await db
          .select()
          .from(checks)
          .where(eq(checks.endpointId, ep.id))
          .orderBy(desc(checks.checkedAt))
          .limit(1);

        // Get checks from last 24 hours using Drizzle
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentChecks = await db
          .select()
          .from(checks)
          .where(
            and(
              eq(checks.endpointId, ep.id),
              gte(checks.checkedAt, twentyFourHoursAgo)
            )
          );

        const total = recentChecks.length;
        const up = recentChecks.filter((check) => check.status === "up").length;
        const uptime = total > 0 ? (up / total) * 100 : 100;

        return {
          ...ep,
          createdAt: ep.createdAt.toISOString(),
          latest: latest
            ? {
                ...latest,
                checkedAt: latest.checkedAt.toISOString(),
              }
            : null,
          uptime: uptime.toFixed(2),
        };
      })
    );

    const response = {
      ...page,
      createdAt: page.createdAt.toISOString(),
      endpoints: data,
    };

    return c.json(response, 200);
  });

  app.openapi(createPageRoute, async (c) => {
    const body = c.req.valid("json");

    // Check if slug already exists
    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, body.slug))
      .limit(1);

    if (existing) {
      return c.json({ error: "Slug already exists" } as const, 400);
    }

    const [newPage] = await db
      .insert(pages)
      .values({
        name: body.name,
        slug: body.slug,
      })
      .returning();

    return c.json(
      {
        ...newPage,
        createdAt: newPage.createdAt.toISOString(),
      },
      201
    );
  });

  app.openapi(updatePageRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");

    // Find the page
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (!page) {
      return c.json({ error: "Page not found" }, 404);
    }

    // If slug is being updated, check if new slug already exists
    if (body.slug && body.slug !== slug) {
      const [existing] = await db
        .select()
        .from(pages)
        .where(eq(pages.slug, body.slug))
        .limit(1);

      if (existing) {
        return c.json({ error: "Slug already exists" }, 400);
      }
    }

    // Update the page
    const updateData: { name?: string; slug?: string } = {};
    if (body.name) updateData.name = body.name;
    if (body.slug) updateData.slug = body.slug;

    const [updatedPage] = await db
      .update(pages)
      .set(updateData)
      .where(eq(pages.id, page.id))
      .returning();

    return c.json(
      {
        ...updatedPage,
        createdAt: updatedPage.createdAt.toISOString(),
      },
      200
    );
  });

  app.openapi(getPageTimelineRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const { hours } = c.req.valid("query");
    const hoursNum = parseInt(hours) || 24;

    // Find the page
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);

    if (!page) {
      return c.json({ error: "Page not found" }, 404);
    }

    // Get all endpoints for this page
    const pageEndpoints = await db
      .select()
      .from(endpoints)
      .where(and(eq(endpoints.pageId, page.id), eq(endpoints.active, true)));

    if (pageEndpoints.length === 0) {
      return c.json([], 200);
    }

    const endpointIds = pageEndpoints.map((ep) => ep.id);

    // Get checks from the last N hours for all endpoints
    const timeAgo = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
    const allChecks = await db
      .select()
      .from(checks)
      .where(
        and(
          inArray(checks.endpointId, endpointIds),
          gte(checks.checkedAt, timeAgo)
        )
      )
      .orderBy(desc(checks.checkedAt));

    // Serialize dates
    const serialized = allChecks.map((check) => ({
      ...check,
      checkedAt: check.checkedAt.toISOString(),
    }));

    return c.json(serialized, 200);
  });
}
