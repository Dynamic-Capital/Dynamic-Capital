#!/usr/bin/env node

/**
 * Clone and bootstrap the Ton Console dashboard locally.
 *
 * The script is idempotent: rerunning it updates the existing checkout
 * and reinstalls dependencies only when necessary.
 */

import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_URL = "https://github.com/tonkeeper/ton-console.git";
const DEFAULT_BRANCH = process.env.TON_CONSOLE_BRANCH ?? "master";
const DEFAULT_DIR = process.env.TON_CONSOLE_DIR ??
  path.join("external", "ton-console");
const EXPLICIT_PACKAGE_MANAGER = process.env.TON_CONSOLE_PM;
const DEFAULT_PACKAGE_MANAGER = EXPLICIT_PACKAGE_MANAGER ?? "npm";

function parseArgs(argv) {
  const result = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const key = rawKey.trim();
    if (!key) {
      continue;
    }
    const value = rest.length > 0 ? rest.join("=") : "true";
    result.set(key, value);
  }
  return result;
}

function resolveTargetDir(parsedArgs) {
  const override = parsedArgs.get("dir");
  return path.resolve(process.cwd(), override ?? DEFAULT_DIR);
}

function resolveBranch(parsedArgs) {
  const override = parsedArgs.get("branch");
  return override ?? DEFAULT_BRANCH;
}

function shouldSkipInstall(parsedArgs) {
  const flag = parsedArgs.get("skip-install");
  return flag === "true";
}

function printStep(message) {
  process.stdout.write(`\n🔧 ${message}\n`);
}

async function ensureParentDir(targetDir) {
  const parent = path.dirname(targetDir);
  await mkdir(parent, { recursive: true });
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error && (error.code === "ENOENT" || error.code === "ENOTDIR")) {
      return false;
    }
    throw error;
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? "inherit",
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${command} ${args.join(" ")} exited with code ${code}`),
        );
      }
    });
  });
}

async function ensureGitAvailable() {
  try {
    await runCommand("git", ["--version"], { stdio: "ignore" });
  } catch (error) {
    throw new Error("git is required but was not found in PATH");
  }
}

async function cloneRepository({ branch, targetDir }) {
  printStep(`Cloning Ton Console (${branch}) into ${targetDir}`);
  await ensureParentDir(targetDir);
  await runCommand("git", [
    "clone",
    "--branch",
    branch,
    "--depth",
    "1",
    REPO_URL,
    targetDir,
  ]);
}

async function updateRepository({ branch, targetDir }) {
  printStep(`Updating existing Ton Console checkout at ${targetDir}`);
  await runCommand("git", [
    "-C",
    targetDir,
    "fetch",
    "--depth",
    "1",
    "origin",
    branch,
  ]);
  await runCommand("git", ["-C", targetDir, "checkout", branch]);
  await runCommand("git", [
    "-C",
    targetDir,
    "pull",
    "--ff-only",
    "origin",
    branch,
  ]);
}

async function detectPackageLock(targetDir) {
  if (await pathExists(path.join(targetDir, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (await pathExists(path.join(targetDir, "yarn.lock"))) {
    return "yarn";
  }
  if (await pathExists(path.join(targetDir, "package-lock.json"))) {
    return "npm";
  }
  return null;
}

async function installDependencies(targetDir) {
  const detected = await detectPackageLock(targetDir);
  const manager = EXPLICIT_PACKAGE_MANAGER ?? detected ?? "npm";

  let args;
  if (manager === "pnpm") {
    args = ["install"];
  } else if (manager === "yarn") {
    args = ["install", "--immutable"];
  } else if (manager === "npm") {
    const useCi = await pathExists(path.join(targetDir, "package-lock.json"));
    args = [useCi ? "ci" : "install"];
  } else {
    throw new Error(
      "Unsupported package manager. Use npm, pnpm, or yarn via TON_CONSOLE_PM.",
    );
  }

  printStep(`Installing dependencies with ${manager} ${args.join(" ")}`);
  await runCommand(manager, args, { cwd: targetDir });
  return { manager, args };
}

async function ensureEnvFile(targetDir) {
  const envLocal = path.join(targetDir, ".env.local");
  if (await pathExists(envLocal)) {
    return false;
  }
  const preferredSource = path.join(targetDir, ".env.development");
  if (!(await pathExists(preferredSource))) {
    return false;
  }
  await copyFile(preferredSource, envLocal);
  return true;
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const targetDir = resolveTargetDir(parsedArgs);
  const branch = resolveBranch(parsedArgs);
  const skipInstall = shouldSkipInstall(parsedArgs);

  await ensureGitAvailable();

  const hasCheckout = await pathExists(path.join(targetDir, ".git"));

  if (!hasCheckout) {
    await cloneRepository({ branch, targetDir });
  } else {
    await updateRepository({ branch, targetDir });
  }

  const steps = [];
  let installSummary;

  if (!skipInstall) {
    const result = await installDependencies(targetDir);
    installSummary = result.manager;
    steps.push(`dependencies installed via ${result.manager}`);
  } else {
    steps.push("dependency installation skipped");
  }

  const envCreated = await ensureEnvFile(targetDir);
  if (envCreated) {
    steps.push("created .env.local from .env.development");
  }

  const packageJsonPath = path.join(targetDir, "package.json");
  let startHint = "npm run dev";
  const preferredManager = installSummary ?? DEFAULT_PACKAGE_MANAGER;
  if (await pathExists(packageJsonPath)) {
    try {
      const raw = await stat(packageJsonPath);
      if (raw.isFile()) {
        const packageJson = JSON.parse(
          await readFile(packageJsonPath, "utf-8"),
        );
        if (typeof packageJson?.scripts?.dev === "string") {
          startHint = `${preferredManager} run dev`;
        }
      }
    } catch (error) {
      steps.push(`warning: unable to read package.json (${error.message})`);
    }
  }

  printStep("Ton Console workspace ready");
  console.log(`➡️  Location: ${targetDir}`);
  console.log(`➡️  Branch: ${branch}`);
  console.log(`➡️  Summary: ${steps.join(", ")}`);
  console.log(`\nNext steps:`);
  console.log(`  1. cd ${targetDir}`);
  console.log(`  2. ${startHint}`);
  console.log("  3. Sign in with your Ton Console account to link projects.");
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
});
