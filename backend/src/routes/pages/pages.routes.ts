import { createRoute, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { pages, endpoints, checks } from "../../db/schema.js";

const PageSchema = createSelectSchema(pages);
const EndpointSchema = createSelectSchema(endpoints);
const CheckSchema = createSelectSchema(checks);

const EndpointWithStatsSchema = EndpointSchema.extend({
  latest: CheckSchema.nullable().optional(),
  uptime: z.string(),
});

const PageWithEndpointsSchema = PageSchema.extend({
  endpoints: z.array(EndpointWithStatsSchema),
});

export const listPagesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Pages"],
  summary: "List all status pages",
  description: "Get a list of all status pages",
  responses: {
    200: {
      description: "List of status pages",
      content: {
        "application/json": {
          schema: z.array(PageSchema),
        },
      },
    },
  },
});

export const getPageBySlugRoute = createRoute({
  method: "get",
  path: "/{slug}",
  tags: ["Pages"],
  summary: "Get page by slug",
  description: "Get a status page with its endpoints and statistics",
  request: {
    params: z.object({
      slug: z.string().openapi({ param: { name: "slug", in: "path" } }),
    }),
  },
  responses: {
    200: {
      description: "Status page with endpoints",
      content: {
        "application/json": {
          schema: PageWithEndpointsSchema,
        },
      },
    },
    404: {
      description: "Page not found",
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

const CreatePageSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
});

export const createPageRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Pages"],
  summary: "Create a new status page",
  description: "Create a new status page",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreatePageSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Page created",
      content: {
        "application/json": {
          schema: PageSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
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

const UpdatePageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    )
    .optional(),
});

export const updatePageRoute = createRoute({
  method: "patch",
  path: "/{slug}",
  tags: ["Pages"],
  summary: "Update a status page",
  description: "Update a status page by slug",
  request: {
    params: z.object({
      slug: z.string().openapi({ param: { name: "slug", in: "path" } }),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdatePageSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Page updated",
      content: {
        "application/json": {
          schema: PageSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    404: {
      description: "Page not found",
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

export const getPageTimelineRoute = createRoute({
  method: "get",
  path: "/{slug}/timeline",
  tags: ["Pages"],
  summary: "Get page timeline",
  description:
    "Get check history for all endpoints on a page for timeline display",
  request: {
    params: z.object({
      slug: z.string().openapi({ param: { name: "slug", in: "path" } }),
    }),
    query: z.object({
      hours: z.string().optional().default("24"),
    }),
  },
  responses: {
    200: {
      description: "Timeline data",
      content: {
        "application/json": {
          schema: z.array(CheckSchema),
        },
      },
    },
    404: {
      description: "Page not found",
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
