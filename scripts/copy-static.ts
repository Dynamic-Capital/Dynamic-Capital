import { spawn } from "node:child_process";
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
const copyOnly = args.has("--copy-only") || process.env.SKIP_NEXT_BUILD === "1";

if (!process.env.DISABLE_HTTP_REDIRECTS) {
  process.env.DISABLE_HTTP_REDIRECTS = "true";
}

const root = process.cwd();
const projectRoot = join(root, "..", "..");
const runNextBuildScript = join(projectRoot, "scripts", "run-next-build.mjs");
const nextStatic = join(root, ".next", "static");
const nextStandalone = join(
  root,
  ".next",
  "standalone",
  "apps",
  "web",
  "server.js",
);
const nextMiddlewareManifest = join(
  root,
  ".next",
  "server",
  "middleware-manifest.json",
);
const publicDir = join(root, "public");
// Copy build output to a repository-level `_static` directory so the site can be
// served as a regular static site (e.g. on DigitalOcean).
const destRoot = join(projectRoot, "_static");

async function runNextBuild() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("node", [runNextBuildScript], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Next.js build terminated with signal ${signal}`));
        return;
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Next.js build exited with code ${code ?? "null"}`));
      }
    });
  });
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

type EnsureBuildArtifactsOptions = {
  allowBuild?: boolean;
};

async function ensureBuildArtifacts(
  options: EnsureBuildArtifactsOptions = {},
) {
  const { allowBuild = false } = options;

  const hasStandalone = await exists(nextStandalone);
  const hasMiddlewareManifest = await exists(nextMiddlewareManifest);

  if (hasStandalone && hasMiddlewareManifest) {
    return;
  }

  const canRunBuild = allowBuild && process.env.SKIP_NEXT_BUILD !== "1";

  if (!hasMiddlewareManifest && canRunBuild) {
    console.warn(
      "⚠️  Next.js build artifacts missing; running `next build` before snapshot capture.",
    );
    await runNextBuild();

    if (await exists(nextStandalone) && await exists(nextMiddlewareManifest)) {
      return;
    }
  }

  const missingArtifacts: string[] = [];
  if (!hasStandalone) {
    missingArtifacts.push(
      ".next/standalone/apps/web/server.js",
    );
  }
  if (!hasMiddlewareManifest) {
    missingArtifacts.push(
      ".next/server/middleware-manifest.json",
    );
  }

  if (missingArtifacts.length > 0) {
    throw new Error(
      `Next.js build outputs missing: ${missingArtifacts.join(", ")}. Run ` +
        "`next build` before executing the static snapshot task.",
    );
  }
}

async function fetchWithRedirects(
  url: string,
  maxRedirects = 5,
  init?: RequestInit,
) {
  let currentUrl = url;
  const baseInit = init ? { ...init } : undefined;
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const res = await fetch(currentUrl, {
      ...baseInit,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return res;
      }
      const nextUrl = new URL(location, currentUrl);
      const baseUrl = new URL(currentUrl);
      nextUrl.protocol = "http:";
      if (!nextUrl.port) {
        nextUrl.port = baseUrl.port;
      }
      if (nextUrl.hostname === "localhost") {
        nextUrl.hostname = baseUrl.hostname;
      }
      currentUrl = nextUrl.toString();
      continue;
    }
    return res;
  }
  throw new Error(`Too many redirects while fetching ${url}`);
}

type WaitForServerOptions = {
  retries?: number;
  delayMs?: number;
  shouldAbort?: () => boolean;
  getAbortError?: () => Error | undefined;
  checkPaths?: string[];
  fetchInit?: RequestInit;
};

async function waitForServer(url: string, options: WaitForServerOptions = {}) {
  const {
    retries = 50,
    delayMs = 200,
    shouldAbort,
    getAbortError,
    checkPaths = ["/healthz", "/api/healthz", "/"],
    fetchInit,
  } = options;

  const normalizedPaths = checkPaths.length > 0
    ? Array.from(
      new Set(
        checkPaths.map((path) => {
          if (!path) {
            return "/";
          }
          return path.startsWith("/") ? path : `/${path}`;
        }),
      ),
    )
    : ["/"];

  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (shouldAbort?.()) {
      throw getAbortError?.() ?? new Error(`Aborted while waiting for ${url}`);
    }
    for (const path of normalizedPaths) {
      if (shouldAbort?.()) {
        throw getAbortError?.() ??
          new Error(`Aborted while waiting for ${url}`);
      }
      try {
        const target = new URL(path, url).toString();
        const res = await fetchWithRedirects(target, 5, fetchInit);
        if (res.ok || res.status === 404) {
          return;
        }
        lastError = res.status;
      } catch (err) {
        lastError = err;
      }
    }
    if (shouldAbort?.()) {
      throw getAbortError?.() ?? new Error(`Aborted while waiting for ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  const fallbackError = lastError instanceof Error
    ? lastError
    : new Error(`Timed out waiting for Next.js server at ${url}`);
  throw getAbortError?.() ?? fallbackError;
}

async function fetchHtml(url: string, init?: RequestInit) {
  const res = await fetchWithRedirects(url, 5, init);
  if (!res.ok && res.status !== 404) {
    throw new Error(`Unexpected status ${res.status} fetching ${url}`);
  }
  return await res.text();
}

async function startServerAndCapture() {
  const port = Number(process.env.STATIC_EXPORT_PORT || 4123);
  const baseUrl = `http://127.0.0.1:${port}`;

  let serverCwd = join(root, ".next", "standalone");
  let command = "node";
  let args = [nextStandalone];

  if (!(await exists(nextStandalone))) {
    const nextExecutableName = process.platform === "win32"
      ? "next.cmd"
      : "next";
    const nextExecutable = join(
      projectRoot,
      "node_modules",
      ".bin",
      nextExecutableName,
    );
    const resolvedCommand = (await exists(nextExecutable))
      ? nextExecutable
      : nextExecutableName;

    console.warn(
      "⚠️  Next.js standalone server not found; falling back to `next start` for snapshot capture.",
    );

    command = resolvedCommand;
    args = ["start", "-p", String(port), "-H", "127.0.0.1"];
    serverCwd = root;
  }

  const defaultSiteUrl = process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabaseUrl = process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://stub.supabase.co";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "stub-anon-key";

  const server = spawn(command, args, {
    cwd: serverCwd,
    env: {
      ...process.env,
      SITE_URL: process.env.SITE_URL || defaultSiteUrl,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl,
      SUPABASE_URL: process.env.SUPABASE_URL || supabaseUrl,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ||
        supabaseUrl,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || supabaseAnonKey,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || defaultSiteUrl,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      DISABLE_HTTP_REDIRECTS: "true",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });

  let shuttingDown = false;
  let serverExited = false;
  let exitError: Error | undefined;

  const exitPromise = new Promise<void>((resolve) => {
    server.once("exit", (code, signal) => {
      if (!shuttingDown) {
        serverExited = true;
        exitError = exitError ??
          new Error(
            `Next.js server exited before it became ready (code: ${
              code ?? "null"
            }, signal: ${signal ?? "null"}).`,
          );
      }
      resolve();
    });
  });

  server.once("error", (err) => {
    if (shuttingDown) {
      return;
    }
    serverExited = true;
    exitError = err instanceof Error ? err : new Error(String(err));
  });

  const fetchInit: RequestInit = {
    headers: {
      "accept-language": "en-US,en;q=0.9",
    },
  };

  try {
    await waitForServer(baseUrl, {
      retries: 75,
      delayMs: 200,
      shouldAbort: () => serverExited,
      getAbortError: () =>
        exitError ??
          new Error(`Next.js server exited before ${baseUrl} responded.`),
      fetchInit,
    });

    const indexHtml = await fetchHtml(`${baseUrl}/`, fetchInit);
    await writeFile(join(destRoot, "index.html"), indexHtml, "utf8");

    const notFoundHtml = await fetchHtml(
      `${baseUrl}/__static-not-found`,
      fetchInit,
    );
    await writeFile(join(destRoot, "404.html"), notFoundHtml, "utf8");
  } finally {
    shuttingDown = true;
    if (!server.killed) {
      server.kill("SIGTERM");
    }
    await exitPromise;
  }
}

async function copyAssets() {
  // Reset destination directory to ensure no stale files linger
  await rm(destRoot, { recursive: true, force: true });
  await mkdir(destRoot, { recursive: true });

  if (await exists(nextStatic)) {
    await mkdir(join(destRoot, "_next"), { recursive: true });
    await cp(nextStatic, join(destRoot, "_next", "static"), {
      recursive: true,
    });
  } else {
    console.warn("⚠️  No static assets found at", nextStatic);
  }

  if (await exists(publicDir)) {
    await cp(publicDir, destRoot, { recursive: true });
  }

  await ensureBuildArtifacts({ allowBuild: copyOnly });
  await startServerAndCapture();

  const wellKnownDir = join(destRoot, ".well-known");
  await mkdir(wellKnownDir, { recursive: true });
  await writeFile(join(wellKnownDir, "health"), "ok", "utf8");

  console.log("✅ Exported landing snapshot to", destRoot);
}

async function main() {
  if (!copyOnly) {
    try {
      await runNextBuild();
    } catch (err) {
      console.error("❌ Next.js build failed:", err);
      process.exit(1);
    }
  }

  await copyAssets();
}

main().catch((err) => {
  console.error("❌ Failed to copy static assets:", err);
  process.exit(1);
});
