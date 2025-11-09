import { db } from "./index.js";
import { pages, endpoints } from "./schema.js";
import { logger } from "../logger.js";

export async function seed() {
  const pageCount = await db.select().from(pages).limit(1);
  if (pageCount.length > 0) {
    logger.info("Database already seeded");
    return;
  }

  const [demoPage] = await db
    .insert(pages)
    .values({ slug: "demo", name: "Uptimatum Demo" })
    .returning();

  const [prodPage] = await db
    .insert(pages)
    .values({ slug: "production", name: "Production Services" })
    .returning();

  await db.insert(endpoints).values([
    { pageId: demoPage.id, name: "Google", url: "https://www.google.com" },
    { pageId: demoPage.id, name: "GitHub", url: "https://github.com" },
    {
      pageId: prodPage.id,
      name: "JSONPlaceholder API",
      url: "https://jsonplaceholder.typicode.com/posts/1",
    },
  ]);

  logger.info("✅ Database seeded");
}
