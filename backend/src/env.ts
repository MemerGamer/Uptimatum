import { z } from "zod";

const envSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().default("5432"),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  PORT: z.string().default("3000"),
  CHECK_INTERVAL: z.string().default("30"),
  CHECK_TIMEOUT: z.string().default("10"),
  CHECK_RETENTION_DAYS: z.string().default("30"), // Keep checks for 30 days by default
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = getEnv();
