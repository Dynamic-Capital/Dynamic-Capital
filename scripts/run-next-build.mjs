#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = "production";

const resolvedOrigin = process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.LOVABLE_ORIGIN ||
  "http://localhost:8080";

const defaultNotices = [];

if (!process.env.SITE_URL) {
  process.env.SITE_URL = resolvedOrigin;
  defaultNotices.push(`SITE_URL → ${resolvedOrigin}`);
}

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = process.env.SITE_URL;
  defaultNotices.push(`NEXT_PUBLIC_SITE_URL → ${process.env.SITE_URL}`);
}

if (!process.env.MINIAPP_ORIGIN) {
  process.env.MINIAPP_ORIGIN = process.env.SITE_URL;
  defaultNotices.push(`MINIAPP_ORIGIN → ${process.env.SITE_URL}`);
}

if (!process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS = process.env.SITE_URL;
  defaultNotices.push(`ALLOWED_ORIGINS → ${process.env.SITE_URL}`);
}

if (defaultNotices.length > 0) {
  console.warn(
    "Missing environment variables detected. Applying friendly defaults so the Next.js build has a canonical origin.",
    defaultNotices,
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
