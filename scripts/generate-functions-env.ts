#!/usr/bin/env -S deno run -A
// scripts/generate-functions-env.ts
// deno-lint-ignore-file no-console
import { parse } from "https://deno.land/std@0.224.0/toml/mod.ts";
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

const repoRoot = dirname(dirname(fromFileUrl(import.meta.url)));
const configPath = join(repoRoot, "supabase", "config.toml");
const envPath = join(repoRoot, "supabase", "functions", ".env");

const rawConfig = await Deno.readTextFile(configPath);
const parsed = parse(rawConfig) as Record<string, unknown>;

const functionsSection = parsed["functions"];
if (!functionsSection || typeof functionsSection !== "object") {
  console.error("[functions] section is missing from supabase/config.toml");
  Deno.exit(1);
}

const envSection = (functionsSection as Record<string, unknown>)["env"];
if (!envSection || typeof envSection !== "object") {
  console.error(
    "[functions.env] table is missing from supabase/config.toml",
  );
  Deno.exit(1);
}

const envEntries = Object.entries(envSection as Record<string, unknown>)
  .filter(([, value]) => value !== undefined && value !== null)
  .map(([key, value]) => [key, String(value)] as const)
  .sort(([a], [b]) => a.localeCompare(b));

if (envEntries.length === 0) {
  console.error("No entries found in [functions.env]; nothing to write.");
  Deno.exit(1);
}

const header = [
  "# Generated from supabase/config.toml [functions.env]",
  "# Run `deno run -A scripts/generate-functions-env.ts` after editing the table above.",
  "",
];
const body = envEntries.map(([key, value]) => `${key}=${value}`);
const output = [...header, ...body].join("\n") + "\n";

let needsWrite = true;
try {
  const existing = await Deno.readTextFile(envPath);
  if (existing === output) {
    needsWrite = false;
  }
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound)) {
    throw error;
  }
}

if (!needsWrite) {
  console.log("supabase/functions/.env is already up to date.");
  Deno.exit(0);
}

await Deno.writeTextFile(envPath, output);
console.log("Wrote supabase/functions/.env");
