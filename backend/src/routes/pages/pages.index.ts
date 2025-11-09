import { OpenAPIHono } from "@hono/zod-openapi";
import { registerPagesHandlers } from "./pages.handlers.js";

const pagesRouter = new OpenAPIHono();

registerPagesHandlers(pagesRouter);

export default pagesRouter;
