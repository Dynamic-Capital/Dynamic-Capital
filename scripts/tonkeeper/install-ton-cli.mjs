#!/usr/bin/env node

import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import process from "node:process";

const PACKAGE_NAME = "toncli";

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    python: { type: "string" },
    upgrade: { type: "boolean", default: false },
    global: { type: "boolean", default: false },
    pipx: { type: "boolean", default: false },
    pre: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

function usage() {
  return `Usage: install-ton-cli.mjs [options]\n\n` +
    "Options:\n" +
    "  --version <semver>   Install a specific toncli version\n" +
    "  --python <command>   Python interpreter to use (default python3)\n" +
    "  --upgrade            Upgrade the package if already installed\n" +
    "  --global             Perform a system-wide installation (no --user)\n" +
    "  --pipx               Use pipx instead of python -m pip\n" +
    "  --pre                Allow pre-release versions\n" +
    "  --dry-run            Print commands without executing them\n" +
    "  --help               Show this message\n";
}

if (values.help) {
  console.log(usage());
  process.exit(0);
}

const pythonCommand = values.python ?? "python3";
const requestedVersion = values.version;
const upgrade = values.upgrade;
const globalInstall = values.global;
const usePipx = values.pipx;
const includePre = values.pre;
const dryRun = values["dry-run"];

function buildPackageSpec() {
  return requestedVersion
    ? `${PACKAGE_NAME}==${requestedVersion}`
    : PACKAGE_NAME;
}

function commandToString(command, args) {
  return [command, ...args].join(" ");
}

function run(command, args, { inherit = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: inherit ? "inherit" : "ignore",
      shell: false,
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function commandExists(command, args = ["--version"]) {
  try {
    await run(command, args, { inherit: false });
    return true;
  } catch (_) {
    return false;
  }
}

function getBinHint() {
  if (globalInstall || usePipx) return null;
  if (process.platform === "win32") {
    return "%APPDATA%\\Python\\Python311\\Scripts";
  }
  return "~/.local/bin";
}

async function installWithPipx(packageSpec) {
  const pipxExists = await commandExists("pipx", ["--version"]);
  if (!pipxExists) {
    throw new Error(
      "pipx is not installed. Install pipx or omit --pipx to use python -m pip.",
    );
  }

  const args = ["install", packageSpec];
  if (upgrade) {
    args.push("--force");
  }
  if (dryRun) {
    console.log(`[dry-run] pipx ${args.join(" ")}`);
    return;
  }

  console.log(`Installing ${packageSpec} via pipx...`);
  await run("pipx", args);
}

async function installWithPip(packageSpec) {
  const pythonExists = await commandExists(pythonCommand, ["--version"]);
  if (!pythonExists) {
    throw new Error(`Python executable '${pythonCommand}' not found.`);
  }

  const args = ["-m", "pip", "install", packageSpec];
  if (upgrade) args.push("--upgrade");
  if (!globalInstall) args.push("--user");
  if (includePre) args.push("--pre");

  if (dryRun) {
    console.log(`[dry-run] ${commandToString(pythonCommand, args)}`);
    return;
  }

  console.log(`Installing ${packageSpec} via ${pythonCommand} -m pip...`);
  await run(pythonCommand, args);
}

async function verifyInstall() {
  try {
    await run("toncli", ["--version"]);
  } catch (error) {
    const binHint = getBinHint();
    console.warn(
      "toncli installation finished, but the executable was not found on PATH.",
    );
    if (binHint) {
      console.warn(
        `Add ${binHint} to your PATH or invoke toncli via '${pythonCommand} -m toncli'.`,
      );
    } else {
      console.warn(error.message);
    }
  }
}

async function main() {
  const packageSpec = buildPackageSpec();

  if (usePipx) {
    await installWithPipx(packageSpec);
  } else {
    await installWithPip(packageSpec);
  }

  if (!dryRun) {
    await verifyInstall();
  }

  if (!dryRun) {
    console.log(`${PACKAGE_NAME} installation completed.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  console.error(usage());
  process.exitCode = 1;
});
