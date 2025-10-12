#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import os from "node:os";

const SUPPORTED_PLATFORMS = new Map([
  ["linux", "linux"],
  ["darwin", "darwin"],
]);

const ARCH_MAP = new Map([
  ["x64", "amd64"],
  ["arm64", "arm64"],
]);

const DEFAULT_INSTALL_DIR = path.resolve(
  path.join(process.cwd(), ".bin"),
);

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    "install-dir": { type: "string" },
    context: { type: "string" },
    token: { type: "string" },
    "config-dir": { type: "string" },
    force: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

function usage() {
  return `Usage: install-doctl.mjs [options]\n\n` +
    "Options:\n" +
    "  --version <semver|latest>  Release to install (default: latest)\n" +
    "  --install-dir <path>       Directory to place the doctl binary (default: ./.bin)\n" +
    "  --context <name>           Configure or switch to this doctl context after install\n" +
    "  --token <value>            DigitalOcean access token used for doctl auth\n" +
    "  --config-dir <path>        Override DOCTL_CONFIG_HOME while authenticating\n" +
    "  --force                    Overwrite any existing doctl binary in the install dir\n" +
    "  --dry-run                  Print the planned steps without downloading/installing\n" +
    "  --help                     Show this help message\n";
}

if (values.help) {
  console.log(usage());
  process.exit(0);
}

const requestedVersion = values.version ?? "latest";
const installDir = resolvePath(values["install-dir"] ?? DEFAULT_INSTALL_DIR);
const requestedContext = values.context;
const providedToken = values.token ?? process.env.DIGITALOCEAN_ACCESS_TOKEN;
const configDir = values["config-dir"]
  ? resolvePath(values["config-dir"])
  : undefined;
const force = values.force;
const dryRun = values["dry-run"];

function resolvePath(input) {
  if (!input) return input;
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return path.resolve(input);
}

async function resolveVersion(tag) {
  const cleaned = tag.replace(/^v/, "");
  if (cleaned !== "latest") {
    return cleaned;
  }

  const latestUrl =
    "https://api.github.com/repos/digitalocean/doctl/releases/latest";
  const response = await fetch(latestUrl, {
    headers: {
      "User-Agent": "Dynamic-Capital-doctl-installer",
      "Accept": "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to resolve latest doctl release (status ${response.status}).`,
    );
  }

  const json = await response.json();
  const tagName = json?.tag_name;
  if (typeof tagName !== "string") {
    throw new Error("GitHub release response did not include a tag name.");
  }

  return tagName.replace(/^v/, "");
}

function getTargetPlatform() {
  const mapped = SUPPORTED_PLATFORMS.get(process.platform);
  if (!mapped) {
    const supported = Array.from(SUPPORTED_PLATFORMS.keys()).join(", ");
    throw new Error(
      `Unsupported platform '${process.platform}'. Supported platforms: ${supported}.`,
    );
  }
  return mapped;
}

function getTargetArch() {
  const mapped = ARCH_MAP.get(process.arch);
  if (!mapped) {
    const supported = Array.from(ARCH_MAP.keys()).join(", ");
    throw new Error(
      `Unsupported architecture '${process.arch}'. Supported architectures: ${supported}.`,
    );
  }
  return mapped;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function download(url, destination) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Dynamic-Capital-doctl-installer",
      "Accept": "application/octet-stream",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download ${url} (status ${response.status}).`,
    );
  }

  await pipeline(response.body, createWriteStream(destination));
}

async function run(command, args, { stdio = "inherit" } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio });
    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

async function extract(archivePath, destinationDir) {
  await ensureDir(destinationDir);
  await run("tar", ["-xzf", archivePath, "-C", destinationDir]);
}

async function copyBinary(extractedDir, destination) {
  const binaryName = "doctl";
  const sourcePath = path.join(extractedDir, binaryName);
  try {
    await fs.access(sourcePath);
  } catch (error) {
    throw new Error(
      `Extracted archive did not include ${binaryName} (expected at ${sourcePath}).`,
    );
  }

  await ensureDir(path.dirname(destination));
  await fs.copyFile(sourcePath, destination);
  await fs.chmod(destination, 0o755);
}

async function commandExists(command, args = ["version"]) {
  try {
    await run(command, args, { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

function printDryRun(message) {
  if (dryRun) {
    console.log(`[dry-run] ${message}`);
  }
}

async function authenticateDoctl(binaryPath) {
  const token = providedToken;
  if (!token) {
    console.log(
      "No token supplied. Skipping doctl authentication. Provide --token or set DIGITALOCEAN_ACCESS_TOKEN.",
    );
    return;
  }

  const args = ["auth", "init", "--access-token", token];
  if (requestedContext) {
    args.push("--context", requestedContext);
  }

  const printableArgs = args.map((part) => part === token ? "***" : part);
  if (dryRun) {
    printDryRun(`${binaryPath} ${printableArgs.join(" ")}`);
    return;
  }

  const runOptions = { stdio: "inherit" };
  const env = { ...process.env };
  if (configDir) {
    env.DOCTL_CONFIG_HOME = configDir;
  }

  await new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: runOptions.stdio,
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`doctl auth init exited with ${code}`));
    });
  });

  if (requestedContext && !dryRun) {
    await run(binaryPath, ["auth", "switch", "--context", requestedContext], {
      stdio: "inherit",
    });
  }
}

async function main() {
  const version = await resolveVersion(requestedVersion);
  const platform = getTargetPlatform();
  const arch = getTargetArch();
  const archiveName = `doctl-${version}-${platform}-${arch}.tar.gz`;
  const downloadUrl =
    `https://github.com/digitalocean/doctl/releases/download/v${version}/${archiveName}`;
  const binaryDestination = path.join(installDir, "doctl");

  if (!dryRun) {
    const exists = await commandExists(binaryDestination, ["version"]);
    if (exists && !force) {
      throw new Error(
        `doctl already exists at ${binaryDestination}. Re-run with --force to overwrite it.`,
      );
    }
  }

  console.log(`Resolved doctl version: ${version}`);
  console.log(`Target platform: ${platform} (${arch})`);
  console.log(`Install directory: ${installDir}`);

  if (dryRun) {
    const tempHint = path.join(tmpdir(), "doctl-install-XXXXXX");
    printDryRun(`Would download ${downloadUrl}`);
    printDryRun(`Would extract archive under ${tempHint}`);
    printDryRun(`Would copy binary to ${binaryDestination}`);
    if (providedToken) {
      printDryRun(
        `Would authenticate context '${requestedContext ?? "default"}'`,
      );
    }
    return;
  }

  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "doctl-install-"));
  const archivePath = path.join(tempDir, archiveName);
  const extractDir = path.join(tempDir, "extracted");

  try {
    console.log(`Downloading ${downloadUrl} ...`);
    await download(downloadUrl, archivePath);

    console.log(`Extracting ${archivePath} ...`);
    await extract(archivePath, extractDir);

    console.log(`Installing doctl to ${binaryDestination} ...`);
    await copyBinary(extractDir, binaryDestination);

    const versionArgs = ["version"];
    await run(binaryDestination, versionArgs);

    await authenticateDoctl(binaryDestination);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  console.log("doctl installation complete.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
