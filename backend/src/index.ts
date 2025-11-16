import { env } from "./env.js";
import app from "./app.js";
import { initDB } from "./db/index.js";
import { startChecker } from "./checker.js";
import { logger } from "./logger.js";

async function main() {
  try {
    await initDB();
    await startChecker();

    const port = parseInt(env.PORT);
    const server = Bun.serve({
      fetch: app.fetch,
      port,
      hostname: "0.0.0.0", // Bind to all interfaces for Kubernetes
    });

    logger.info({ port }, `🚀 Uptimatum API running on port ${port}`);

    // Keep process alive
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully");
      process.exit(0);
    });
  } catch (error) {
    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { raw: String(error), type: typeof error };

    logger.error({ error: errorDetails }, "Failed to start server");
    throw error;
  }
}

main().catch((error) => {
  const errorDetails =
    error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { raw: String(error), type: typeof error };

  logger.error({ error: errorDetails }, "Failed to start server");
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  const reasonDetails =
    reason instanceof Error
      ? { message: reason.message, stack: reason.stack, name: reason.name }
      : String(reason);

  logger.error({ reason: reasonDetails }, "Unhandled promise rejection");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error(
    { error: { message: error.message, stack: error.stack, name: error.name } },
    "Uncaught exception"
  );
  process.exit(1);
});
