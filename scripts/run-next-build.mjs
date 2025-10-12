#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  applyBrandingEnvDefaults,
  PRODUCTION_ORIGIN,
} from "./utils/branding-env.mjs";
import { syncDeskClock } from "./utils/time-sync.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const timeSyncOutcome = syncDeskClock({ logger: console });
if (!timeSyncOutcome.ok) {
  console.warn(
    "⚠️  Proceeding with Next.js build despite timezone synchronization issues.",
  );
}

process.env.NODE_ENV = "production";

const LOCAL_DEV_ORIGIN = "http://localhost:8080";

const isCI = typeof process.env.CI === "string" &&
  process.env.CI.length > 0 &&
  process.env.CI !== "0" &&
  process.env.CI.toLowerCase() !== "false";

const fallbackOrigin = isCI ? PRODUCTION_ORIGIN : LOCAL_DEV_ORIGIN;

const {
  defaultedKeys: defaultNotices,
  originSource,
  preferSyncedOrigin,
  resolvedOrigin,
} = applyBrandingEnvDefaults({
  allowedOrigins: ({ env, resolvedOrigin: origin }) => env.SITE_URL ?? origin,
  fallbackOrigin,
  includeSupabasePlaceholders: false,
  preferFallbackForEphemeralHosts: isCI,
});

if (defaultNotices.length > 0) {
  console.warn(
    "Missing environment variables detected. Applying friendly defaults so the Next.js build has a canonical origin.",
    defaultNotices,
  );
} else {
  const originDetails = preferSyncedOrigin && originSource === "fallback"
    ? `${resolvedOrigin} (synced fallback)`
    : `${resolvedOrigin} (source: ${originSource})`;
  console.info(
    `Branding origin already configured for Next.js build: ${originDetails}`,
  );
}

const cwd = process.cwd();
const workspaceRoot = path.resolve(__dirname, "..");

const binCandidates = [
  path.join(cwd, "node_modules", ".bin"),
  path.join(workspaceRoot, "node_modules", ".bin"),
  path.join(__dirname, "node_modules", ".bin"),
];

const existingPathEntries = (process.env.PATH || "")
  .split(path.delimiter)
  .filter(Boolean);

for (const dir of binCandidates) {
  if (existsSync(dir) && !existingPathEntries.includes(dir)) {
    existingPathEntries.unshift(dir);
  }
}

const augmentedEnv = {
  ...process.env,
  PATH: existingPathEntries.join(path.delimiter),
};

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function syncStandaloneAssets() {
  const nextRoot = path.join(cwd, ".next");
  const standaloneAppDir = path.join(
    nextRoot,
    "standalone",
    "apps",
    "web",
  );

  if (!await pathExists(standaloneAppDir)) {
    console.warn(
      "Next.js standalone output missing; skipping asset sync.",
    );
    return;
  }

  const assets = [];

  const staticSource = path.join(nextRoot, "static");
  const staticTarget = path.join(standaloneAppDir, ".next", "static");
  if (await pathExists(staticSource)) {
    await rm(staticTarget, { recursive: true, force: true });
    await mkdir(path.dirname(staticTarget), { recursive: true });
    await cp(staticSource, staticTarget, { recursive: true });
    assets.push("Next static");
  } else {
    console.warn(
      `Next.js standalone asset sync skipped: static assets not found at ${staticSource}.`,
    );
  }

  const publicSource = path.join(cwd, "public");
  const publicTarget = path.join(standaloneAppDir, "public");
  if (await pathExists(publicSource)) {
    await rm(publicTarget, { recursive: true, force: true });
    await mkdir(path.dirname(publicTarget), { recursive: true });
    await cp(publicSource, publicTarget, { recursive: true });
    assets.push("public");
  } else {
    console.warn(
      `Next.js standalone asset sync skipped: public assets not found at ${publicSource}.`,
    );
  }

  if (assets.length === 0) {
    throw new Error(
      "Next.js standalone asset sync failed: expected public or static assets to copy.",
    );
  }

  console.log(
    `Next.js standalone asset sync completed for ${assets.join(" & ")}.`,
  );
}

const child = spawn("next", ["build"], {
  cwd,
  env: augmentedEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

let stderrBuffer = "";

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
});

child.stderr.on("data", (chunk) => {
  stderrBuffer += chunk.toString();
  process.stderr.write(chunk);
});

child.on("close", async (code) => {
  if (code === 0) {
    try {
      await syncStandaloneAssets();
    } catch (error) {
      console.error("Failed to prepare Next.js standalone assets:", error);
      process.exit(1);
      return;
    }
    process.exit(0);
  }

  const pattern =
    /ENOENT: no such file or directory, copyfile '([^']*routes-manifest\.json)' -> '([^']*routes-manifest\.json)'/;
  const match = stderrBuffer.match(pattern);

  if (match) {
    const [, rawSrc, rawDest] = match;
    const src = path.isAbsolute(rawSrc) ? rawSrc : path.join(cwd, rawSrc);
    const dest = path.isAbsolute(rawDest) ? rawDest : path.join(cwd, rawDest);

    try {
      if (!existsSync(src)) {
        throw new Error(`source missing at ${src}`);
      }

      await mkdir(path.dirname(dest), { recursive: true });
      await copyFile(src, dest);
      console.warn(
        "⚠️  Patched missing routes-manifest.json for Next.js standalone output.",
      );
      process.exit(0);
    } catch (err) {
      console.error(
        "Failed to recover from Next.js routes-manifest copy error:",
        err,
      );
    }
  }

  process.exit(code ?? 1);
});
