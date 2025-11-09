import { OpenAPIHono } from "@hono/zod-openapi";
import { registerBadgeHandlers } from "./badge.handlers.js";

const badgeRouter = new OpenAPIHono();

registerBadgeHandlers(badgeRouter);

export default badgeRouter;
