import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { logger as honoLogger } from "hono/logger";
import { pinoLogger } from "hono-pino";
import { Scalar } from "@scalar/hono-api-reference";
import { logger } from "./logger.js";
import { cors } from "hono/cors";
import { z } from "zod";
import pagesRouter from "./routes/pages/pages.index.js";
import endpointsRouter from "./routes/endpoints/endpoints.index.js";
import badgeRouter from "./routes/badge/badge.index.js";
import incidentsRouter from "./routes/incidents/incidents.index.js";

const app = new OpenAPIHono();

// Logger
app.use("*", honoLogger());
app.use("*", pinoLogger({ pino: logger }));

// CORS
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.openapi(
  createRoute({
    method: "get",
    path: "/health",
    tags: ["Health"],
    summary: "Health check",
    description: "Check if the API is running",
    responses: {
      200: {
        description: "API is healthy",
        content: {
          "application/json": {
            schema: z.object({
              status: z.string().openapi({ example: "ok" }),
            }),
          },
        },
      },
    },
  }),
  (c) => {
    return c.json({ status: "ok" });
  }
);

// API Documentation
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Uptimatum API",
    description: "The Ultimate Self-Hosted Status Page Platform API",
  },
  servers: [
    {
      url: "/",
      description: "Current server",
    },
  ],
});

// Scalar API Reference
app.get("/reference", async (c) => {
  const handler = (Scalar as any)({
    spec: {
      url: "/doc",
    },
    theme: "default",
    layout: "modern",
  });
  return handler(c);
});

// Routes
app.route("/api/pages", pagesRouter);
app.route("/api/endpoints", endpointsRouter);
app.route("/api/incidents", incidentsRouter);
app.route("/badge", badgeRouter);

export type AppType = typeof app;
export default app;
