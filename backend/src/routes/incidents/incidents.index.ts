import { OpenAPIHono } from "@hono/zod-openapi";
import { registerIncidentsHandlers } from "./incidents.handlers.js";

const incidentsRouter = new OpenAPIHono();

registerIncidentsHandlers(incidentsRouter);

export default incidentsRouter;
