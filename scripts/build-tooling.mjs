#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const packages = [
  { name: "naming-engine", cwd: "naming-engine" },
  { name: "algorithms/vercel-webhook", cwd: "algorithms/vercel-webhook" },
  { name: "dynamic-capital-ton/apps/bot", cwd: "dynamic-capital-ton/apps/bot" },
];

const rawArgs = new Set(process.argv.slice(2));
const skipInstall = rawArgs.has("--no-install");

async function runCommand(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with exit code ${code}.`,
          ),
        );
      }
    });
  });
}

async function ensureDependencies(name, packageCwd) {
  if (skipInstall) {
    if (!existsSync(path.join(packageCwd, "node_modules"))) {
      console.warn(
        `⚠️  Skipping install for ${name} because --no-install was provided.`,
      );
    }
    return;
  }

  console.log(`\n📦 Installing dependencies for ${name}...`);
  await runCommand("npm", ["install"], {
    cwd: packageCwd,
    stdio: "inherit",
    env: process.env,
  });
}

async function runBuild({ name, cwd }) {
  const packageCwd = path.join(repoRoot, cwd);

  await ensureDependencies(name, packageCwd);

  console.log(`\n🚧 Building ${name}...`);

  await runCommand("npm", ["run", "build"], {
    cwd: packageCwd,
    stdio: "inherit",
    env: process.env,
  });

  console.log(`✅ ${name} build completed.`);
}

(async () => {
  for (const pkg of packages) {
    await runBuild(pkg);
  }

  console.log("\n🏁 All tooling builds finished successfully.");
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
