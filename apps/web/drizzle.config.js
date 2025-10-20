import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const processEnv = typeof globalThis === "object" &&
    typeof globalThis.process === "object" &&
    globalThis.process !== null &&
    typeof globalThis.process.env === "object" &&
    globalThis.process.env !== null
  ? globalThis.process.env
  : {};

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: processEnv.DATABASE_URL ??
      `postgresql://postgres:${processEnv.SUPABASE_DB_PASSWORD}@db.${processEnv.SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`,
  },
});
