import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL ??
  `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${process.env.SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`;

export const db = drizzle(postgres(connectionString));
