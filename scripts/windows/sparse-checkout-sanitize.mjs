#!/usr/bin/env node
import { spawnSync } from "node:child_process";

// Add repo-specific patterns here to avoid Windows-invalid tracked files
const excludePatterns = [
  "!/public/liquidity/swapcoffee/*",
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) {
    process.exit(r.status || 1);
  }
}

run("git", ["sparse-checkout", "init", "--no-cone"]);
run("git", ["sparse-checkout", "set", "/*", ...excludePatterns]);
console.log(
  "Sparse-checkout updated with exclusions:",
  excludePatterns.join(", "),
);
