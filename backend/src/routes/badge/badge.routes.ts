import { createRoute, z } from "@hono/zod-openapi";

export const getBadgeRoute = createRoute({
  method: "get",
  path: "/{slug}",
  tags: ["Badges"],
  summary: "Get status badge",
  description: "Get an SVG status badge for a status page",
  request: {
    params: z.object({
      slug: z.string().openapi({ param: { name: "slug", in: "path" } }),
    }),
  },
  responses: {
    200: {
      description: "SVG status badge",
      content: {
        "image/svg+xml": {
          schema: z.string(),
        },
      },
    },
    404: {
      description: "Page not found",
      content: {
        "text/plain": {
          schema: z.string(),
        },
      },
    },
  },
});
