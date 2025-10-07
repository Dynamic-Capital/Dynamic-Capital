#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyBrandingEnvDefaults,
  PRODUCTION_ALLOWED_ORIGIN_LIST,
} from "./utils/branding-env.mjs";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";
import { hashDirectory } from "./utils/hash-directory.mjs";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const staticDirectory =
  (process.env.DIGITALOCEAN_STATIC_DIR || "_static").trim() || "_static";
const cacheFileName = "digitalocean-static-fingerprint.json";

const {
  allowedOrigins,
  defaultedKeys: brandingDefaults,
  originSource,
  preferSyncedOrigin,
  resolvedOrigin: canonicalOrigin,
} = applyBrandingEnvDefaults({
  allowedOrigins: ({ env, resolvedOrigin }) => {
    const existing = env.ALLOWED_ORIGINS?.trim();
    if (existing) {
      return existing;
    }
    const defaults = new Set(PRODUCTION_ALLOWED_ORIGIN_LIST);
    defaults.add(resolvedOrigin);
    return Array.from(defaults).join(",");
  },
  includeSupabasePlaceholders: false,
  preferFallbackForEphemeralHosts: true,
});

if (brandingDefaults.length > 0) {
  console.log(
    "DigitalOcean build: applied default branding variables.",
    brandingDefaults.join(", "),
  );
} else {
  const originDescriptor = preferSyncedOrigin && originSource === "fallback"
    ? `${canonicalOrigin} (synced fallback)`
    : `${canonicalOrigin} (source: ${originSource})`;
  console.log(
    `DigitalOcean build: branding environment already configured (origin: ${originDescriptor}).`,
  );
}

if (allowedOrigins) {
  console.log(`DigitalOcean build: ALLOWED_ORIGINS → ${allowedOrigins}`);
}

function run(command, args, options = {}) {
  const { env: providedEnv, ...rest } = options;
  const env = createSanitizedNpmEnv(providedEnv ?? {});
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...rest,
      env,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

function isMissing(value) {
  if (!value) {
    return true;
  }
  if (typeof value === "string" && value.trim() === "") {
    return true;
  }
  return false;
}

function parseBoolean(value) {
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function resolveCacheBaseDir() {
  const candidates = [
    process.env.DIGITALOCEAN_APP_CACHE_DIR,
    process.env.APP_PLATFORM_CACHE_DIR,
    process.env.APP_CACHE_DIR,
    ".do-build-cache",
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const trimmed = String(candidate).trim();
    if (trimmed.length === 0) {
      continue;
    }
    return path.isAbsolute(trimmed) ? trimmed : path.resolve(trimmed);
  }

  return path.resolve(".do-build-cache");
}

const cacheBaseDir = resolveCacheBaseDir();
const cacheFilePath = path.join(cacheBaseDir, cacheFileName);
const npmCacheDir = path.join(cacheBaseDir, "npm-cache");

process.env.NPM_CONFIG_CACHE = npmCacheDir;
process.env.npm_config_cache = npmCacheDir;

async function loadPreviousFingerprint() {
  try {
    const raw = await readFile(cacheFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      !parsed || typeof parsed !== "object" || typeof parsed.hash !== "string"
    ) {
      console.warn(
        `DigitalOcean build: ignoring invalid fingerprint cache at ${cacheFilePath}. Expected an object with a string hash.`,
      );
      return null;
    }
    return parsed;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    console.warn(
      `DigitalOcean build: unable to read cached fingerprint at ${cacheFilePath}. Proceeding without cache.`,
      error,
    );
    return null;
  }
}

async function persistFingerprint(fingerprint) {
  const payload = {
    hash: fingerprint.hash,
    fileCount: fingerprint.fileCount,
    totalBytes: fingerprint.totalBytes,
    savedAt: new Date().toISOString(),
  };

  await mkdir(path.dirname(cacheFilePath), { recursive: true });
  await writeFile(cacheFilePath, JSON.stringify(payload, null, 2), "utf8");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const formatted = value >= 10 || index === 0
    ? value.toFixed(0)
    : value.toFixed(1);
  return `${formatted} ${units[index]}`;
}

async function main() {
  try {
    await mkdir(npmCacheDir, { recursive: true });
    console.log(
      `DigitalOcean build: npm cache directory initialised at ${npmCacheDir}.`,
    );
  } catch (error) {
    console.warn(
      `DigitalOcean build: unable to prepare npm cache directory at ${npmCacheDir}. Continuing without persistent npm cache.`,
      error,
    );
  }

  console.log("DigitalOcean build: running `npm run build`…");
  const buildCode = await run(npmCommand, ["run", "build"]);
  if (buildCode !== 0) {
    console.error("DigitalOcean build: `npm run build` failed. Aborting.");
    process.exit(buildCode);
  }

  const fingerprint = await hashDirectory(staticDirectory);
  if (!fingerprint) {
    console.warn(
      `DigitalOcean build: directory "${staticDirectory}" not found after build. Skipping asset upload.`,
    );
    return;
  }

  const forceUpload = parseBoolean(
    process.env.DIGITALOCEAN_FORCE_UPLOAD ??
      process.env.FORCE_DIGITALOCEAN_UPLOAD,
  );
  const previousFingerprint = await loadPreviousFingerprint();

  if (!forceUpload) {
    if (previousFingerprint && previousFingerprint.hash === fingerprint.hash) {
      console.log(
        "DigitalOcean build: static assets unchanged since last successful upload. Skipping upload and CDN purge.",
      );
      return;
    }

    if (previousFingerprint) {
      console.log(
        "DigitalOcean build: static asset fingerprint changed. Preparing to upload updated assets.",
      );
    } else {
      console.log(
        "DigitalOcean build: no previous asset fingerprint found. Performing full upload.",
      );
    }
  } else {
    console.log(
      "DigitalOcean build: forcing static asset upload due to DIGITALOCEAN_FORCE_UPLOAD flag.",
    );
  }

  const requiredKeys = ["CDN_BUCKET", "CDN_ACCESS_KEY", "CDN_SECRET_KEY"];
  const missingKeys = requiredKeys.filter((key) => isMissing(process.env[key]));

  if (missingKeys.length > 0) {
    console.warn(
      `DigitalOcean build: skipping static asset upload because credentials are missing (${
        missingKeys.join(", ")
      }).`,
    );
    console.warn(
      "Set CDN_BUCKET, CDN_ACCESS_KEY, and CDN_SECRET_KEY to enable uploads during the build.",
    );
    return;
  }

  console.log(
    `DigitalOcean build: uploading "${staticDirectory}/" assets to Spaces (${fingerprint.fileCount} files, ${
      formatBytes(fingerprint.totalBytes)
    }).`,
  );
  const uploadCode = await run(npmCommand, ["run", "upload-assets"]);
  if (uploadCode !== 0) {
    console.error("DigitalOcean build: `npm run upload-assets` failed.");
    process.exit(uploadCode);
  }

  await persistFingerprint(fingerprint);
  console.log(
    "DigitalOcean build: static asset upload completed successfully.",
  );
}

main().catch((error) => {
  console.error(
    "DigitalOcean build: unexpected error while preparing deployment:",
    error,
  );
  process.exit(1);
});
