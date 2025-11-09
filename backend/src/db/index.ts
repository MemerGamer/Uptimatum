import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema.js";
import { env } from "../env.js";
import { logger } from "../logger.js";

const connectionString = `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${
  env.DB_HOST
}:${parseInt(env.DB_PORT)}/${env.DB_NAME}`;

const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
export { client };

async function waitForDB(maxRetries = 30, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try a simple query to test connection
      await client`SELECT 1`;
      logger.info("✅ Database connection established");
      return;
    } catch (error: any) {
      if (i === maxRetries - 1) {
        logger.error({ error: error.message }, "❌ Database connection failed after retries");
        throw error;
      }
      logger.warn(
        { attempt: i + 1, maxRetries, error: error.message },
        "⏳ Waiting for database to be ready..."
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function initDB() {
  try {
    // Wait for database to be ready with retries
    await waitForDB();

    // Run migrations
    await migrate(db, { migrationsFolder: "./drizzle" });
    logger.info("✅ Database migrations applied");

    // Seed initial data
    const pageCount = await db.select().from(schema.pages).limit(1);
    if (pageCount.length === 0) {
      const [demoPage] = await db
        .insert(schema.pages)
        .values({ slug: "demo", name: "Uptimatum Demo" })
        .returning();

      const [prodPage] = await db
        .insert(schema.pages)
        .values({ slug: "production", name: "Production Services" })
        .returning();

      await db.insert(schema.endpoints).values([
        { pageId: demoPage.id, name: "Google", url: "https://www.google.com" },
        { pageId: demoPage.id, name: "GitHub", url: "https://github.com" },
        {
          pageId: prodPage.id,
          name: "JSONPlaceholder API",
          url: "https://jsonplaceholder.typicode.com/posts/1",
        },
      ]);

      logger.info("✅ Database seeded with initial data");
    }
  } catch (error) {
    logger.error({ error }, "❌ Database initialization failed");
    throw error;
  }
}
