import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "../../db/index.js";
import { incidents } from "../../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import {
  listIncidentsRoute,
  createIncidentRoute,
  updateIncidentRoute,
  deleteIncidentRoute,
} from "./incidents.routes.js";

export function registerIncidentsHandlers(app: OpenAPIHono) {
  app.openapi(listIncidentsRoute, async (c) => {
    const { page_id } = c.req.valid("query");
    const pageId = parseInt(page_id);

    const allIncidents = await db
      .select()
      .from(incidents)
      .where(eq(incidents.pageId, pageId))
      .orderBy(desc(incidents.createdAt));

    const serialized = allIncidents.map((incident) => ({
      ...incident,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() || null,
    }));

    return c.json(serialized, 200);
  });

  app.openapi(createIncidentRoute, async (c) => {
    const body = c.req.valid("json");

    const [newIncident] = await db
      .insert(incidents)
      .values({
        pageId: body.page_id,
        title: body.title,
        description: body.description || null,
        status: body.status,
      })
      .returning();

    return c.json(
      {
        ...newIncident,
        createdAt: newIncident.createdAt.toISOString(),
        updatedAt: newIncident.updatedAt.toISOString(),
        resolvedAt: newIncident.resolvedAt?.toISOString() || null,
      },
      201
    );
  });

  app.openapi(updateIncidentRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const incidentId = parseInt(id);

    // Find the incident
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!incident) {
      return c.json({ error: "Incident not found" }, 404);
    }

    // Update the incident
    const updateData: {
      title?: string;
      description?: string | null;
      status?: "investigating" | "identified" | "monitoring" | "resolved";
      updatedAt?: Date;
      resolvedAt?: Date | null;
    } = {
      updatedAt: new Date(),
    };

    if (body.title) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description || null;
    if (body.status) {
      updateData.status = body.status;
      // If status is resolved, set resolvedAt
      if (body.status === "resolved" && !incident.resolvedAt) {
        updateData.resolvedAt = new Date();
      } else if (body.status !== "resolved") {
        updateData.resolvedAt = null;
      }
    }

    const [updatedIncident] = await db
      .update(incidents)
      .set(updateData)
      .where(eq(incidents.id, incidentId))
      .returning();

    return c.json(
      {
        ...updatedIncident,
        createdAt: updatedIncident.createdAt.toISOString(),
        updatedAt: updatedIncident.updatedAt.toISOString(),
        resolvedAt: updatedIncident.resolvedAt?.toISOString() || null,
      },
      200
    );
  });

  app.openapi(deleteIncidentRoute, async (c) => {
    const { id } = c.req.valid("param");
    const incidentId = parseInt(id);

    const [existingIncident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, incidentId))
      .limit(1);

    if (!existingIncident) {
      return c.json({ error: "Incident not found" }, 404);
    }

    await db.delete(incidents).where(eq(incidents.id, incidentId));
    return c.json({ success: true }, 200);
  });
}
