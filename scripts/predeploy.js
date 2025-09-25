#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true });
}

const commands = [
  "DENO_TLS_CA_STORE=system deno check --allow-import=deno.land,registry.npmjs.org,cdn.skypack.dev,lib.deno.dev,jsr.io supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts",
  "npm test",
  "node scripts/assert-miniapp-bundle.mjs",
];

for (const cmd of commands) {
  try {
    run(cmd);
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}
