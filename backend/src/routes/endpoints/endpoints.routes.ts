import { createRoute, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { endpoints, checks } from "../../db/schema.js";

const EndpointSchema = createSelectSchema(endpoints);
const CheckSchema = createSelectSchema(checks);

const CreateEndpointSchema = z.object({
  page_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  interval: z.number().int().positive().default(30),
  timeout: z.number().int().positive().default(10),
});

export const getEndpointHistoryRoute = createRoute({
  method: "get",
  path: "/{id}/history",
  tags: ["Endpoints"],
  summary: "Get endpoint check history",
  description: "Get the check history for a specific endpoint",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      description: "Check history",
      content: {
        "application/json": {
          schema: z.array(CheckSchema),
        },
      },
    },
  },
});

export const createEndpointRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Endpoints"],
  summary: "Create a new endpoint",
  description: "Create a new endpoint to monitor",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateEndpointSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Endpoint created",
      content: {
        "application/json": {
          schema: EndpointSchema,
        },
      },
    },
  },
});

export const deleteEndpointRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Endpoints"],
  summary: "Delete an endpoint",
  description: "Delete an endpoint by ID",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      description: "Endpoint deleted",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
  },
});
