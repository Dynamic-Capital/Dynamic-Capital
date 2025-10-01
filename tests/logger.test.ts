import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";

const importFresh = async () => {
  return await freshImport(
    new URL("../apps/web/utils/logger.ts", import.meta.url),
  );
};

test("logger.error logs in production", async () => {
  process.env.NODE_ENV = "production";
  delete process.env.LOG_LEVEL;
  const calls: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };
  const { logger } = await importFresh();
  logger.error("boom");
  console.error = original;
  assertEquals(calls.length, 1);
});

test("logger respects LOG_LEVEL", async () => {
  process.env.NODE_ENV = "production";
  process.env.LOG_LEVEL = "warn";
  const calls: unknown[][] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    calls.push(args);
  };
  const { logger } = await importFresh();
  logger.info("hidden");
  console.info = originalInfo;
  assertEquals(calls.length, 0);
});
