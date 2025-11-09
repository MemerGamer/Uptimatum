import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("check_status", ["up", "down", "degraded"]);
export const incidentStatusEnum = pgEnum("incident_status", [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const endpoints = pgTable("endpoints", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  method: varchar("method", { length: 10 }).default("GET").notNull(),
  interval: integer("interval").default(30).notNull(),
  timeout: integer("timeout").default(10).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checks = pgTable(
  "checks",
  {
    id: serial("id").primaryKey(),
    endpointId: integer("endpoint_id")
      .references(() => endpoints.id, { onDelete: "cascade" })
      .notNull(),
    status: statusEnum("status").notNull(),
    responseTime: integer("response_time"),
    statusCode: integer("status_code"),
    error: text("error"),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    endpointIdx: index("idx_checks_endpoint").on(table.endpointId),
    timeIdx: index("idx_checks_time").on(table.checkedAt),
  })
);

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: incidentStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type Endpoint = typeof endpoints.$inferSelect;
export type NewEndpoint = typeof endpoints.$inferInsert;
export type Check = typeof checks.$inferSelect;
export type NewCheck = typeof checks.$inferInsert;
