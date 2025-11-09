import { pino } from "pino";
import { existsSync } from "fs";

// Only use pino-pretty in local development (not in Docker)
// In Docker/production, use standard JSON logging
const isDevelopment = process.env.NODE_ENV === "development";
// Detect Docker: check for common Docker indicators
const isDocker =
  process.env.DOCKER === "true" ||
  process.env.NODE_ENV === "production" ||
  process.env.IN_DOCKER === "true" ||
  // Check if /.dockerenv exists (Docker creates this file)
  existsSync("/.dockerenv");

// Only use pretty logging if we're in local dev AND not in Docker
const usePretty = isDevelopment && !isDocker;

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  ...(usePretty && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  }),
});
