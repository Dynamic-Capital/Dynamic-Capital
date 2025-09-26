#!/usr/bin/env node
import { syncDeskClock } from "./utils/time-sync.mjs";

const strict = process.argv.includes("--strict");
const result = syncDeskClock({ logger: console });

if (!result.ok) {
  console.warn(
    "⚠️  Required desk time synchronization steps were not successful.",
  );
  if (result.requiredFailures.length > 0) {
    for (const message of result.requiredFailures) {
      console.warn(`   • ${message}`);
    }
  }

  if (strict) {
    process.exit(1);
  }
}

process.exit(0);
