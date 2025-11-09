import { OpenAPIHono } from "@hono/zod-openapi";
import { registerEndpointsHandlers } from "./endpoints.handlers.js";

const endpointsRouter = new OpenAPIHono();

registerEndpointsHandlers(endpointsRouter);

export default endpointsRouter;
