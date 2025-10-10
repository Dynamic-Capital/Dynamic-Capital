#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const targets = [
  { name: "web", label: "Next.js web app", script: "build:web" },
  { name: "landing", label: "Marketing landing site", script: "build:landing" },
  {
    name: "miniapp",
    label: "Supabase miniapp functions",
    script: "build:miniapp",
  },
  { name: "tooling", label: "Tooling utilities", script: "build:tooling" },
];

const {
  values: { skip = [], only = [] },
} = parseArgs({
  options: {
    skip: { type: "string", multiple: true },
    only: { type: "string", multiple: true },
  },
});

const normalizedSkip = new Set(skip.map((value) => value.toLowerCase()));
const normalizedOnly = new Set(only.map((value) => value.toLowerCase()));

const activeTargets = targets.filter(({ name }) => {
  if (normalizedSkip.has(name)) {
    return false;
  }
  if (normalizedOnly.size > 0) {
    return normalizedOnly.has(name);
  }
  return true;
});

if (activeTargets.length === 0) {
  const configuredTargets = normalizedOnly.size > 0
    ? [...normalizedOnly].join(", ")
    : "[none]";
  console.error(
    `No build targets selected. (--only: ${configuredTargets}, --skip: ${
      [...normalizedSkip].join(", ") || "[none]"
    })`,
  );
  process.exit(1);
}

const runScript = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script], {
      cwd: ROOT_DIR,
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run ${script} exited with code ${code}`));
    });

    child.on("error", (error) => {
      reject(error);
    });
  });

const runAll = async () => {
  for (const target of activeTargets) {
    console.log(`\n🚀 Building ${target.label} (${target.name})...`);
    await runScript(target.script);
    console.log(`✅ Finished ${target.label}.`);
  }

  const summary = activeTargets.map(({ label }) => `• ${label}`).join("\n");
  console.log(
    `\nAll selected build targets completed successfully:\n${summary}`,
  );
};

runAll().catch((error) => {
  console.error(`\n❌ Build pipeline failed: ${error.message}`);
  process.exit(1);
});
