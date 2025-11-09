CREATE TYPE "public"."check_status" AS ENUM('up', 'down', 'degraded');--> statement-breakpoint
CREATE TABLE "checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint_id" integer NOT NULL,
	"status" "check_status" NOT NULL,
	"response_time" integer,
	"status_code" integer,
	"error" text,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"method" varchar(10) DEFAULT 'GET' NOT NULL,
	"interval" integer DEFAULT 30 NOT NULL,
	"timeout" integer DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "checks" ADD CONSTRAINT "checks_endpoint_id_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_checks_endpoint" ON "checks" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "idx_checks_time" ON "checks" USING btree ("checked_at");