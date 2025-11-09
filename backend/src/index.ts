import { serve } from "@hono/node-server";
import { env } from "./env.js";
import app from "./app.js";
import { initDB } from "./db/index.js";
import { startChecker } from "./checker.js";
import { logger } from "./logger.js";

async function main() {
  await initDB();
  await startChecker();

  const port = parseInt(env.PORT);
  serve({ fetch: app.fetch, port });
  logger.info({ port }, `🚀 Uptimatum API running on port ${port}`);
}

main().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
