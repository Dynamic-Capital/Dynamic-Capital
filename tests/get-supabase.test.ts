import test from "node:test";
import { throws } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
import process from "node:process";

interface SupaMockState {
  tables: Record<string, unknown>;
}

type GlobalWithSupaMock = typeof globalThis & { __SUPA_MOCK__?: SupaMockState };

const supaState: SupaMockState = { tables: {} };
const globalWithSupaMock = globalThis as GlobalWithSupaMock;
globalWithSupaMock.__SUPA_MOCK__ = supaState;

function setEnv() {
  process.env.SUPABASE_URL = "http://local";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.TELEGRAM_BOT_TOKEN = "tok";
  // Intentionally omit SUPABASE_SERVICE_ROLE_KEY
}

function cleanup() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.TELEGRAM_BOT_TOKEN;
  supaState.tables = {};
}

test("getSupabase throws when credentials missing", async () => {
  setEnv();
  
  // Set up a mock createClient that throws the expected error
  const clientModule = await import("../supabase/functions/_shared/client.ts");
  const mockCreateClient = () => {
    throw new Error("Missing Supabase credentials");
  };
  clientModule.__setCreateClientOverrideForTests(mockCreateClient);
  
  const mod = await freshImport(
    new URL("../supabase/functions/telegram-bot/index.ts", import.meta.url),
  );
  throws(() => mod.getSupabase(), /Missing Supabase credentials/);
  
  // Clean up the mock
  clientModule.__resetCreateClientOverrideForTests();
  cleanup();
});
