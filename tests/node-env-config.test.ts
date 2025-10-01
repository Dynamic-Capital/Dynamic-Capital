import test from "node:test";
import { equal as assertEqual } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";

const importNodeEnv = async () => {
  const moduleUrl = new URL("../apps/web/config/node-env.ts", import.meta.url);
  return await freshImport(moduleUrl);
};

async function withNodeEnv(
  value: string | undefined,
  run: () => Promise<void>,
) {
  const original = process.env.NODE_ENV;
  if (value === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = value;
  }
  try {
    await run();
  } finally {
    if (original === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = original;
    }
  }
}

test("defaults to development when NODE_ENV missing", async () => {
  await withNodeEnv(undefined, async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, "development");
    assertEqual(mod.isDevelopment, true);
    assertEqual(mod.isProduction, false);
    assertEqual(mod.isTest, false);
  });
});

test("recognizes production NODE_ENV", async () => {
  await withNodeEnv("production", async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, "production");
    assertEqual(mod.isProduction, true);
    assertEqual(mod.isDevelopment, false);
  });
});

test("unknown NODE_ENV values fallback to development", async () => {
  await withNodeEnv("staging", async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, "development");
    assertEqual(mod.isDevelopment, true);
  });
});

test("recognizes test NODE_ENV values regardless of casing", async () => {
  await withNodeEnv(" TEST ", async () => {
    const mod = await importNodeEnv();
    assertEqual(mod.NODE_ENV, "test");
    assertEqual(mod.isTest, true);
  });
});
