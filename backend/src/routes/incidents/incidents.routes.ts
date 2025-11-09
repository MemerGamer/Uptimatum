import { createRoute, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { incidents } from "../../db/schema.js";

const IncidentSchema = createSelectSchema(incidents);

const CreateIncidentSchema = z.object({
  page_id: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(["investigating", "identified", "monitoring", "resolved"])
    .default("investigating"),
});

const UpdateIncidentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum(["investigating", "identified", "monitoring", "resolved"])
    .optional(),
});

export const listIncidentsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Incidents"],
  summary: "List incidents for a page",
  description: "Get all incidents for a status page",
  request: {
    query: z.object({
      page_id: z.string().openapi({ param: { name: "page_id", in: "query" } }),
    }),
  },
  responses: {
    200: {
      description: "List of incidents",
      content: {
        "application/json": {
          schema: z.array(IncidentSchema),
        },
      },
    },
  },
});

export const createIncidentRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Incidents"],
  summary: "Create a new incident",
  description: "Create a new incident for a status page",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateIncidentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Incident created",
      content: {
        "application/json": {
          schema: IncidentSchema,
        },
      },
    },
  },
});

export const updateIncidentRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Incidents"],
  summary: "Update an incident",
  description: "Update an incident by ID",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateIncidentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Incident updated",
      content: {
        "application/json": {
          schema: IncidentSchema,
        },
      },
    },
    404: {
      description: "Incident not found",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

export const deleteIncidentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Incidents"],
  summary: "Delete an incident",
  description: "Delete an incident by ID",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      description: "Incident deleted",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
    404: {
      description: "Incident not found",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});
