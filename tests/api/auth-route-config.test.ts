import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..", "..");

async function run() {
  const routePath = join(
    projectRoot,
    "apps",
    "web",
    "app",
    "api",
    "auth",
    "[...nextauth]",
    "route.ts",
  );
  const source = await readFile(routePath, "utf8");
  assert.ok(
    source.includes("trustHost: true"),
    "Auth route should enable trustHost to support dynamic hosts",
  );
}

if (typeof Deno !== "undefined") {
  Deno.test("Auth route enables trustHost for dynamic hosts", run);
} else {
  const { default: test } = await import(/* @vite-ignore */ "node:test");
  test("Auth route enables trustHost for dynamic hosts", run);
}
