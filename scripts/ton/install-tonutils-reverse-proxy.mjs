#!/usr/bin/env node

import { access, chmod, mkdir, rename, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import path from "node:path";
import process from "node:process";

const REPO = "tonutils/reverse-proxy";
const RELEASE_BASE = `https://github.com/${REPO}/releases`;
const DEFAULT_DEST = path.resolve("tools", "bin");
const USER_AGENT = "dynamic-capital-tonutils-installer";

const assetMatrix = {
  linux: {
    x64: {
      asset: "tonutils-reverse-proxy-linux-amd64",
      binary: "tonutils-reverse-proxy",
    },
    arm64: {
      asset: "tonutils-reverse-proxy-linux-arm64",
      binary: "tonutils-reverse-proxy",
    },
  },
  darwin: {
    x64: {
      asset: "tonutils-reverse-proxy-mac-amd64",
      binary: "tonutils-reverse-proxy",
    },
    arm64: {
      asset: "tonutils-reverse-proxy-mac-arm64",
      binary: "tonutils-reverse-proxy",
    },
  },
  win32: {
    x64: {
      asset: "tonutils-reverse-proxy-windows-x64.exe",
      binary: "tonutils-reverse-proxy.exe",
    },
  },
};

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    dir: { type: "string" },
    platform: { type: "string" },
    arch: { type: "string" },
    force: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

function usage() {
  return `Usage: install-tonutils-reverse-proxy.mjs [options]\n\n` +
    "Options:\n" +
    "  --version <tag>      Download a specific Git tag (defaults to latest release)\n" +
    "  --dir <path>         Destination directory (defaults to tools/bin)\n" +
    "  --platform <name>    Override platform detection (linux, darwin, win32)\n" +
    "  --arch <name>        Override architecture (x64, arm64)\n" +
    "  --force              Overwrite an existing binary\n" +
    "  --dry-run            Print the actions without performing them\n" +
    "  --help               Show this message\n";
}

if (values.help) {
  console.log(usage());
  process.exit(0);
}

const platform = values.platform ?? process.platform;
const arch = values.arch ?? process.arch;

function resolveAsset(platformKey, archKey) {
  const platformEntry = assetMatrix[platformKey];
  if (!platformEntry) {
    throw new Error(
      `Unsupported platform '${platformKey}'. Known platforms: ${
        Object.keys(assetMatrix).join(", ")
      }.`,
    );
  }
  const archEntry = platformEntry[archKey];
  if (!archEntry) {
    throw new Error(
      `Unsupported architecture '${archKey}' for platform '${platformKey}'. Known architectures: ${
        Object.keys(platformEntry).join(", ")
      }.`,
    );
  }
  return archEntry;
}

let archKey = arch;
if (archKey === "amd64") archKey = "x64";
if (archKey === "x86_64") archKey = "x64";

const assetInfo = resolveAsset(platform, archKey);
const destDir = path.resolve(values.dir ?? DEFAULT_DEST);
const binaryName = assetInfo.binary;
const destinationPath = path.join(destDir, binaryName);

const versionTag = values.version;
const versionSegment = versionTag
  ? `/download/${versionTag}`
  : "/latest/download";
const downloadUrl = `${RELEASE_BASE}${versionSegment}/${assetInfo.asset}`;

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath, dryRun) {
  if (await pathExists(dirPath)) return;
  if (dryRun) {
    console.log(`[dry-run] mkdir -p ${dirPath}`);
    return;
  }
  await mkdir(dirPath, { recursive: true });
}

async function downloadFile(url, targetPath, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Download ${url} -> ${targetPath}`);
    return;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const tempPath = `${targetPath}.download`;
  const fileStream = createWriteStream(tempPath, { mode: 0o755 });
  await pipeline(response.body, fileStream);
  await rename(tempPath, targetPath);
}

async function makeExecutable(targetPath, dryRun) {
  if (platform === "win32") return;
  if (dryRun) {
    console.log(`[dry-run] chmod +x ${targetPath}`);
    return;
  }
  await chmod(targetPath, 0o755);
}

async function main() {
  await ensureDir(destDir, values["dry-run"]);

  const exists = await pathExists(destinationPath);
  if (exists && !values.force) {
    const stats = await stat(destinationPath);
    console.log(
      `Tonutils Reverse Proxy already installed at ${destinationPath} (${
        (stats.size / 1024).toFixed(1)
      } KiB). Use --force to overwrite.`,
    );
    return;
  }

  if (exists && values["dry-run"]) {
    console.log(`[dry-run] would overwrite ${destinationPath}`);
  }

  await downloadFile(downloadUrl, destinationPath, values["dry-run"]);
  await makeExecutable(destinationPath, values["dry-run"]);

  console.log(
    values["dry-run"]
      ? `[dry-run] Tonutils Reverse Proxy prepared at ${destinationPath}`
      : `Tonutils Reverse Proxy installed at ${destinationPath}.`,
  );
  if (!values["dry-run"]) {
    console.log(
      `Run '${destinationPath}${
        platform === "win32" ? "" : " --domain <your-domain.ton>"
      }' to link your TON domain.`,
    );
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
