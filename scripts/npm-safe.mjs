#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/npm-safe.mjs <npm arguments>");
  process.exit(1);
}

const child = spawn("npm", args, {
  stdio: "inherit",
  env: createSanitizedNpmEnv(),
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to launch npm:", error);
  process.exit(1);
});
