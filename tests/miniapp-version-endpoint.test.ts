import test from "node:test";
import { equal as assertEquals, ok as assert } from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { freshImport } from "./utils/freshImport.ts";

const globalAny = globalThis as any;
const supaState: any = { tables: {} };
globalAny.__SUPA_MOCK__ = supaState;

type TestEnvMap = Record<string, string>;
let previousTestEnv: TestEnvMap | undefined;
let lastEnvKeys: string[] = [];

function setupEnv(extra: Record<string, string> = {}): TestEnvMap {
  const values: TestEnvMap = {
    SUPABASE_URL: "http://localhost",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    SUPABASE_ANON_KEY: "anon-key",
    ...extra,
  };

  lastEnvKeys = Object.keys(values);
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  previousTestEnv = globalAny.__TEST_ENV__ as TestEnvMap | undefined;
  globalAny.__TEST_ENV__ = { ...(previousTestEnv ?? {}), ...values };

  return values;
}

function cleanupEnv() {
  for (const key of lastEnvKeys) {
    delete process.env[key];
  }
  supaState.tables = {};
  if (previousTestEnv === undefined) {
    delete globalAny.__TEST_ENV__;
  } else {
    globalAny.__TEST_ENV__ = previousTestEnv;
  }
  previousTestEnv = undefined;
  lastEnvKeys = [];
}

test("miniapp version endpoint returns expected fields", async () => {
  const envValues = setupEnv();
  const originalDeno = globalAny.Deno;
  const createdDeno = originalDeno === undefined;
  const denoRef = createdDeno ? {} : originalDeno;
  const originalEnv = denoRef?.env;
  const originalReadTextFile = denoRef?.readTextFile;
  const originalReadFile = denoRef?.readFile;
  const baseGet = typeof originalEnv?.get === "function"
    ? originalEnv.get.bind(originalEnv)
    : undefined;

  if (createdDeno) {
    globalAny.Deno = denoRef;
  }

  denoRef.env = {
    ...(originalEnv ?? {}),
    get: (name: string) => {
      if (name in envValues) return envValues[name];
      return baseGet ? baseGet(name) ?? "" : "";
    },
  };
  denoRef.readTextFile = (path: string) => readFile(path, "utf8");
  denoRef.readFile = readFile;

  try {
    const mod = await freshImport(
      new URL("../supabase/functions/miniapp/index.ts", import.meta.url),
    );
    const handler: (req: Request) => Promise<Response> | Response = mod.default;
    const res = await handler(
      new Request("https://example.com/miniapp/version"),
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assert(typeof body === "object" && body);
    assertEquals(body.name, "miniapp");
    assert(typeof body.ts === "string" && body.ts.length > 0);
    assert("serveFromStorage" in body);
    assert("htmlCompressionDisabled" in body);
  } finally {
    if (createdDeno) {
      delete globalAny.Deno;
    } else {
      if (originalEnv === undefined) {
        delete denoRef.env;
      } else {
        denoRef.env = originalEnv;
      }
      if (originalReadTextFile === undefined) {
        delete denoRef.readTextFile;
      } else {
        denoRef.readTextFile = originalReadTextFile;
      }
      if (originalReadFile === undefined) {
        delete denoRef.readFile;
      } else {
        denoRef.readFile = originalReadFile;
      }
    }
    cleanupEnv();
  }
});
