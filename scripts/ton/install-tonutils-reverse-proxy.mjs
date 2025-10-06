#!/usr/bin/env node

import { access, chmod, mkdir, rename, stat, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { parseArgs, promisify } from "node:util";
import path from "node:path";
import process from "node:process";

const REPO = "tonutils/reverse-proxy";
const API_BASE = `https://api.github.com/repos/${REPO}`;
const DEFAULT_DEST = path.resolve("tools", "bin");
const USER_AGENT = "dynamic-capital-tonutils-installer";
const execFileAsync = promisify(execFile);

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
    token: { type: "string" },
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
const token = values.token ?? process.env.GITHUB_TOKEN;

async function requestGithubJson(url) {
  const args = [
    "-sS",
    "-L",
    "-w",
    "\n%{http_code}",
    "-H",
    `User-Agent: ${USER_AGENT}`,
    "-H",
    "Accept: application/vnd.github+json",
  ];
  if (token) {
    args.push("-H", `Authorization: Bearer ${token}`);
  }
  args.push(url);

  let stdout;
  try {
    ({ stdout } = await execFileAsync("curl", args));
  } catch (error) {
    const stderr = (error && typeof error === "object" && "stderr" in error)
      ? String(error.stderr ?? "").trim()
      : "";
    const message = stderr ||
      (error instanceof Error ? error.message : String(error));
    throw new Error(`curl request to ${url} failed: ${message}`);
  }

  const trimmed = stdout.trimEnd();
  const lines = trimmed.split("\n");
  const statusText = lines.pop() ?? "";
  const status = Number.parseInt(statusText, 10);
  const body = lines.join("\n");

  if (!Number.isFinite(status)) {
    throw new Error(`Unexpected response from GitHub API when calling ${url}.`);
  }

  const parseJsonBody = () => {
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(
        `Failed to parse GitHub API response from ${url}: ${
          (error instanceof Error) ? error.message : String(error)
        }`,
      );
    }
  };

  if (status === 403) {
    const payload = parseJsonBody();
    const detail = typeof payload?.message === "string"
      ? payload.message
      : "GitHub API rate limit exceeded.";
    throw new Error(
      `${detail} Provide a token via --token or the GITHUB_TOKEN environment variable.`,
    );
  }

  if (status < 200 || status >= 300) {
    const payload = parseJsonBody();
    const detail = typeof payload?.message === "string"
      ? payload.message
      : body.trim() || `HTTP ${status}`;
    throw new Error(`GitHub API request to ${url} failed: ${detail}`);
  }

  return parseJsonBody();
}

async function resolveReleaseAsset(version, assetName) {
  const endpoint = version
    ? `${API_BASE}/releases/tags/${encodeURIComponent(version)}`
    : `${API_BASE}/releases/latest`;
  const release = await requestGithubJson(endpoint);

  const assets = Array.isArray(release.assets) ? release.assets : [];
  const match = assets.find((asset) => asset.name === assetName);

  if (!match) {
    const available = assets.map((asset) => asset.name).join(", ") || "<none>";
    throw new Error(
      `Asset '${assetName}' not found in release ${
        release.tag_name ?? version ?? "(unknown)"
      }. Available assets: ${available}.`,
    );
  }

  return {
    downloadUrl: match.browser_download_url,
    resolvedTag: release.tag_name ?? version ?? "unknown",
    assetSize: typeof match.size === "number" ? match.size : undefined,
  };
}

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

async function downloadFile(url, targetPath, { dryRun, force }) {
  if (dryRun) {
    console.log(`[dry-run] Download ${url} -> ${targetPath}`);
    return;
  }

  const tempPath = `${targetPath}.download`;
  const args = [
    "-fL",
    "-o",
    tempPath,
    "-H",
    `User-Agent: ${USER_AGENT}`,
    "-H",
    "Accept: application/octet-stream",
  ];
  if (token) {
    args.push("-H", `Authorization: Bearer ${token}`);
  }
  args.push(url);

  try {
    await execFileAsync("curl", args);
    if (force && await pathExists(targetPath)) {
      await unlink(targetPath);
    }
    await rename(tempPath, targetPath);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    const stderr = (error && typeof error === "object" && "stderr" in error)
      ? String(error.stderr ?? "").trim()
      : "";
    const message = stderr ||
      (error instanceof Error ? error.message : String(error));
    throw new Error(`curl download failed: ${message}`);
  }
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

  const { downloadUrl, resolvedTag, assetSize } = await resolveReleaseAsset(
    values.version,
    assetInfo.asset,
  );

  if (values["dry-run"]) {
    const sizeText = assetSize
      ? ` (~${(assetSize / 1024 / 1024).toFixed(2)} MiB)`
      : "";
    console.log(
      `[dry-run] Resolved release ${resolvedTag} asset ${assetInfo.asset}${sizeText}`,
    );
  }

  const exists = await pathExists(destinationPath);
  if (exists && !values.force) {
    const stats = await stat(destinationPath);
    console.log(
      `Tonutils Reverse Proxy already installed at ${destinationPath} (${
        (stats.size / 1024).toFixed(1)
      } KiB). Use --force to reinstall release ${resolvedTag}.`,
    );
    return;
  }

  if (exists && values["dry-run"]) {
    console.log(`[dry-run] would overwrite ${destinationPath}`);
  }

  await downloadFile(downloadUrl, destinationPath, {
    dryRun: values["dry-run"],
    force: values.force,
  });
  await makeExecutable(destinationPath, values["dry-run"]);

  console.log(
    values["dry-run"]
      ? `[dry-run] Tonutils Reverse Proxy ${resolvedTag} prepared at ${destinationPath}`
      : `Tonutils Reverse Proxy ${resolvedTag} installed at ${destinationPath}.`,
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
