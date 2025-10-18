#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";
import { syncDeskClock } from "./utils/time-sync.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const webWorkspace = join(repoRoot, "apps", "web");
const staticDir = join(repoRoot, "_static");
const backupDir = join(repoRoot, "_static.backup");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const nextArtifactPaths = [
  join(webWorkspace, ".next", "server", "middleware-manifest.json"),
  join(
    webWorkspace,
    ".next",
    "standalone",
    "apps",
    "web",
    "server.js",
  ),
];

const ARTIFACT_WAIT_TIMEOUT_MS = 360_000;
const ARTIFACT_WAIT_POLL_MS = 5_000;

const timeSyncOutcome = syncDeskClock({ logger: console });
if (!timeSyncOutcome.ok) {
  console.warn(
    "⚠️  Proceeding with landing snapshot build despite timezone synchronization issues.",
  );
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, options = {}) {
  const { env: envOverrides, ...rest } = options ?? {};
  const env = createSanitizedNpmEnv(envOverrides ?? {});
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...rest,
      env,
    });

    child.on("close", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });

    child.on("error", () => {
      resolve(1);
    });
  });
}

async function backupStaticDir() {
  if (!(await pathExists(staticDir))) {
    await rm(backupDir, { recursive: true, force: true });
    return false;
  }

  await rm(backupDir, { recursive: true, force: true });
  await mkdir(backupDir, { recursive: true });
  await cp(staticDir, backupDir, { recursive: true });
  return true;
}

async function restoreBackup() {
  if (!(await pathExists(backupDir))) {
    return false;
  }

  await rm(staticDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });
  await cp(backupDir, staticDir, { recursive: true });
  return true;
}

async function writeFallbackHtml() {
  const title = "Dynamic Capital – Snapshot unavailable";
  const message =
    "We're temporarily unable to refresh the landing snapshot because the web build did not succeed. The previous export will remain in place until the build is fixed.";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background-color: #050505;
        color: #f5f5f5;
      }
      body {
        display: grid;
        min-height: 100vh;
        place-items: center;
        margin: 0;
        padding: 2rem;
        background: radial-gradient(circle at top, rgba(80, 112, 255, 0.2), transparent 55%),
          radial-gradient(circle at bottom, rgba(0, 204, 255, 0.15), transparent 60%), #050505;
      }
      .card {
        max-width: 36rem;
        border-radius: 1.5rem;
        background: rgba(12, 12, 20, 0.85);
        padding: 2.5rem;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      h1 {
        margin: 0 0 1rem;
        font-size: clamp(1.8rem, 2.5vw, 2.4rem);
      }
      p {
        margin: 0 0 1.5rem;
        line-height: 1.6;
        opacity: 0.85;
      }
      .meta {
        font-size: 0.875rem;
        opacity: 0.6;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${title}</h1>
      <p>${message}</p>
      <p class="meta">Last updated: ${new Date().toISOString()}</p>
    </main>
  </body>
</html>
`;

  const notFound = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page not found</title>
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #050505;
        color: #f5f5f5;
      }
      main {
        text-align: center;
        padding: 2rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>We\'ll be right back</h1>
      <p>We couldn\'t refresh the static export for this route.</p>
    </main>
  </body>
</html>
`;

  await rm(staticDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });
  await writeFile(join(staticDir, "index.html"), html, "utf8");
  await writeFile(join(staticDir, "404.html"), notFound, "utf8");
}

async function waitForNextArtifacts({
  timeoutMs = ARTIFACT_WAIT_TIMEOUT_MS,
  pollMs = ARTIFACT_WAIT_POLL_MS,
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const checks = await Promise.all(
      nextArtifactPaths.map((artifact) => pathExists(artifact)),
    );

    if (checks.every(Boolean)) {
      return true;
    }

    await delay(pollMs);
  }

  return false;
}

async function runCopyStatic({ copyOnly, extraEnv = {} }) {
  const env = {
    ALLOW_NEXT_RUNTIME_FALLBACKS: "1",
    ...extraEnv,
  };
  if (copyOnly) {
    return runCommand(npmCommand, ["run", "copy-static"], {
      cwd: webWorkspace,
      env,
    });
  }

  return runCommand(npxCommand, ["tsx", "../../scripts/copy-static.ts"], {
    cwd: webWorkspace,
    env,
  });
}

async function landingSnapshotExists() {
  return pathExists(join(staticDir, "index.html"));
}

async function main() {
  const hadBackup = await backupStaticDir();

  let status = await runCopyStatic({
    copyOnly: true,
    extraEnv: {
      SKIP_NEXT_BUILD: "1",
    },
  });

  if (status !== 0) {
    console.warn(
      "⚠️  Copy-only snapshot refresh failed. Attempting full rebuild via Next.js…",
    );
    console.info(
      "ℹ️  Waiting up to 6 minutes for the parallel Next.js web build to produce export artifacts...",
    );
    const artifactsAvailable = await waitForNextArtifacts();

    if (artifactsAvailable) {
      console.info(
        "ℹ️  Detected fresh Next.js build output. Retrying snapshot capture before triggering a rebuild.",
      );
      status = await runCopyStatic({
        copyOnly: true,
        extraEnv: {
          SKIP_NEXT_BUILD: "1",
        },
      });
    }

    if (status !== 0) {
      console.warn(
        "⚠️  Next.js web build artifacts still unavailable; running a dedicated rebuild for the landing snapshot.",
      );
      status = await runCopyStatic({ copyOnly: false });
    }
  }

  const snapshotPresent = await landingSnapshotExists();

  if (status === 0 && snapshotPresent) {
    await rm(backupDir, { recursive: true, force: true });
    console.log("✅ Landing snapshot refreshed from Next.js build.");
    return;
  }

  console.warn(
    "⚠️  Unable to refresh landing snapshot from the Next.js app. Preserving the last good export.",
  );

  if (hadBackup && (await restoreBackup())) {
    console.warn("ℹ️  Restored previous `_static/` snapshot from backup.");
  } else {
    await writeFallbackHtml();
    console.warn(
      "ℹ️  Generated a minimal placeholder snapshot so the build can continue.",
    );
  }

  await rm(backupDir, { recursive: true, force: true });
  process.exitCode = 0;
}

main().catch((err) => {
  console.error("❌ Unexpected error while building landing snapshot:", err);
  process.exit(1);
});
