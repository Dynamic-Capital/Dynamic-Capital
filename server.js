/**
 * Always sign the code pages.
 * © 2025 Dynamic Capital. All Rights Reserved.
 * Author: Deathcoder (2016)
 * Worksnap Short: Refreshed header metadata to include tracking details per request.
 * Hours Spent: 0.10
 * Timestamp: 2025-10-02T12:31:00Z
 * Milestones: Header comment updated with Worksnap summary fields.
 */
import http from "node:http";
import https from "node:https";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import process from "node:process";
import {
  getCacheControl,
  getContentType,
} from "./scripts/utils/static-assets.js";

const port = process.env.PORT || 3000;
const moduleDir = dirname(fileURLToPath(import.meta.url));
const configuredStaticRootValue = typeof process.env.STATIC_ROOT === "string"
  ? process.env.STATIC_ROOT.trim()
  : undefined;

function resolveConfiguredStaticRoot(raw) {
  if (!raw) return undefined;
  if (isAbsolute(raw)) {
    return normalize(raw);
  }

  const moduleRelative = normalize(resolve(moduleDir, raw));
  if (existsSync(moduleRelative)) {
    return moduleRelative;
  }

  return normalize(resolve(process.cwd(), raw));
}

function findNearestStaticRoot(startDir) {
  if (!startDir) return undefined;
  let current = startDir;
  const visited = new Set();
  while (!visited.has(current)) {
    const candidate = join(current, "_static");
    if (existsSync(candidate)) {
      return normalize(candidate);
    }
    visited.add(current);
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return undefined;
}

const candidateStaticRoots = [];
const seenStaticRoots = new Set();

function addCandidateStaticRoot(path, source) {
  if (!path) return;
  const normalized = normalize(path);
  if (seenStaticRoots.has(normalized)) {
    return;
  }
  seenStaticRoots.add(normalized);
  candidateStaticRoots.push({ path: normalized, source });
}

const resolvedConfiguredStaticRoot = resolveConfiguredStaticRoot(
  configuredStaticRootValue,
);
if (resolvedConfiguredStaticRoot) {
  addCandidateStaticRoot(
    resolvedConfiguredStaticRoot,
    "STATIC_ROOT configuration",
  );
}

addCandidateStaticRoot(
  findNearestStaticRoot(moduleDir),
  "nearest _static relative to server.js",
);
addCandidateStaticRoot(
  findNearestStaticRoot(process.cwd()),
  "nearest _static relative to process.cwd()",
);
addCandidateStaticRoot(
  join(moduleDir, "_static"),
  "server.js/_static fallback",
);
addCandidateStaticRoot(
  resolve(process.cwd(), "_static"),
  "process.cwd()/_static fallback",
);

let staticRootEntry;
for (const candidate of candidateStaticRoots) {
  if (existsSync(candidate.path)) {
    staticRootEntry = candidate;
    break;
  }
}

if (!staticRootEntry) {
  staticRootEntry = candidateStaticRoots[0];
  if (staticRootEntry) {
    console.warn(
      `[static] Unable to confirm existence of static assets; using ${staticRootEntry.path}.`,
    );
  } else {
    throw new Error("Unable to determine static asset directory");
  }
}

if (
  resolvedConfiguredStaticRoot &&
  resolvedConfiguredStaticRoot !== staticRootEntry.path &&
  !existsSync(resolvedConfiguredStaticRoot)
) {
  console.warn(
    `[static] STATIC_ROOT ${resolvedConfiguredStaticRoot} not found; falling back to ${staticRootEntry.path} (${staticRootEntry.source}).`,
  );
} else if (
  candidateStaticRoots.length > 0 &&
  staticRootEntry.path !== candidateStaticRoots[0].path
) {
  console.warn(
    `[static] Serving assets from ${staticRootEntry.path} (${staticRootEntry.source}).`,
  );
}

if (!process.env.STATIC_ROOT) {
  process.env.STATIC_ROOT = staticRootEntry.path;
}

const staticRoot = staticRootEntry.path;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const LOOPBACK_PATTERNS = [/^127\./, /^::1$/, /^::ffff:127\./];

function coerceSiteUrl(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

function coerceHost(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(candidate).hostname;
  } catch {
    return undefined;
  }
}

function coerceCommit(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null"
  ) {
    return undefined;
  }
  return trimmed;
}

const siteUrlSources = [
  ["SITE_URL", process.env.SITE_URL],
  ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL],
  ["URL", process.env.URL],
  ["APP_URL", process.env.APP_URL],
  ["PUBLIC_URL", process.env.PUBLIC_URL],
  ["DEPLOY_URL", process.env.DEPLOY_URL],
  ["DEPLOYMENT_URL", process.env.DEPLOYMENT_URL],
  ["DIGITALOCEAN_APP_URL", process.env.DIGITALOCEAN_APP_URL],
  [
    "DIGITALOCEAN_APP_SITE_DOMAIN",
    process.env.DIGITALOCEAN_APP_SITE_DOMAIN,
  ],
  [
    "VERCEL_URL",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ],
];

let SITE_URL = undefined;
let siteUrlSource = undefined;
for (const [source, value] of siteUrlSources) {
  const normalized = coerceSiteUrl(value);
  if (normalized) {
    SITE_URL = normalized;
    siteUrlSource = source;
    break;
  }
}

if (!SITE_URL) {
  SITE_URL = "http://localhost:3000";
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "SITE_URL is not configured; defaulting to http://localhost:3000. Set SITE_URL or NEXT_PUBLIC_SITE_URL to your canonical domain.",
    );
  }
} else if (
  process.env.NODE_ENV === "production" &&
  siteUrlSource &&
  !["SITE_URL", "NEXT_PUBLIC_SITE_URL"].includes(siteUrlSource)
) {
  console.warn(
    `SITE_URL not provided. Using ${siteUrlSource} to derive ${SITE_URL}. Set SITE_URL to avoid fallback behaviour.`,
  );
}

const canonicalHostSources = [
  ["PRIMARY_HOST", process.env.PRIMARY_HOST],
  ["DIGITALOCEAN_APP_SITE_DOMAIN", process.env.DIGITALOCEAN_APP_SITE_DOMAIN],
  ["DIGITALOCEAN_APP_URL", process.env.DIGITALOCEAN_APP_URL],
];

let CANONICAL_HOST = undefined;
let canonicalHostSource = undefined;
for (const [source, value] of canonicalHostSources) {
  const normalized = coerceHost(value);
  if (normalized) {
    CANONICAL_HOST = normalized;
    canonicalHostSource = source;
    break;
  }
}

if (!CANONICAL_HOST) {
  CANONICAL_HOST = new URL(SITE_URL).hostname;
  canonicalHostSource = canonicalHostSource ?? "SITE_URL";
} else {
  const siteUrlHost = new URL(SITE_URL).hostname;
  if (siteUrlHost !== CANONICAL_HOST) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `Overriding SITE_URL host ${siteUrlHost} with ${CANONICAL_HOST} derived from ${canonicalHostSource}.`,
      );
    }
    SITE_URL = `https://${CANONICAL_HOST}`;
  }
}

CANONICAL_HOST = CANONICAL_HOST.toLowerCase();

process.env.SITE_URL = SITE_URL;

const CANONICAL_ORIGIN = SITE_URL;

const defaultOrigin = SITE_URL;
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;

const commitSources = [
  ["COMMIT_SHA", process.env.COMMIT_SHA],
  ["GIT_COMMIT_SHA", process.env.GIT_COMMIT_SHA],
  ["GIT_COMMIT", process.env.GIT_COMMIT],
  ["VERCEL_GIT_COMMIT_SHA", process.env.VERCEL_GIT_COMMIT_SHA],
  ["SOURCE_VERSION", process.env.SOURCE_VERSION],
  ["DIGITALOCEAN_GIT_COMMIT_SHA", process.env.DIGITALOCEAN_GIT_COMMIT_SHA],
  ["DIGITALOCEAN_DEPLOYMENT_ID", process.env.DIGITALOCEAN_DEPLOYMENT_ID],
  [
    "DIGITALOCEAN_APP_DEPLOYMENT_SHA",
    process.env.DIGITALOCEAN_APP_DEPLOYMENT_SHA,
  ],
  ["RENDER_GIT_COMMIT", process.env.RENDER_GIT_COMMIT],
  ["HEROKU_SLUG_COMMIT", process.env.HEROKU_SLUG_COMMIT],
];

let COMMIT_SHA = "unknown";
for (const [source, value] of commitSources) {
  const normalized = coerceCommit(value);
  if (normalized) {
    COMMIT_SHA = normalized;
    if (!process.env.COMMIT_SHA) {
      process.env.COMMIT_SHA = COMMIT_SHA;
    }
    break;
  }
}

if (!process.env.COMMIT_SHA) {
  process.env.COMMIT_SHA = COMMIT_SHA;
}

let allowedOrigins;
if (rawAllowedOrigins === undefined) {
  allowedOrigins = [defaultOrigin];
  if (!process.env.SITE_URL) {
    console.warn(
      `[CORS] ALLOWED_ORIGINS is missing; defaulting to ${defaultOrigin}`,
    );
  }
} else if (rawAllowedOrigins.trim() === "") {
  allowedOrigins = ["*"];
} else {
  allowedOrigins = rawAllowedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    console.warn(
      `[CORS] ALLOWED_ORIGINS is empty; defaulting to ${defaultOrigin}`,
    );
    allowedOrigins = [defaultOrigin];
  }
}

if (!allowedOrigins.includes("*") && !allowedOrigins.includes(defaultOrigin)) {
  allowedOrigins.push(defaultOrigin);
}

const allowAllOrigins = allowedOrigins.includes("*");
const allowedOriginSet = new Set(allowedOrigins);
allowedOriginSet.delete("*");

// Simple in-memory rate limiting to mitigate basic DDoS attacks
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 100;
const requestCounts = new Map(); // ip -> { count, startTime }

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts) {
    if (now - record.startTime > rateLimitWindowMs) {
      requestCounts.delete(ip);
    }
  }
}, rateLimitWindowMs);

async function streamFile(req, res, filePath, status = 200) {
  const type = getContentType(filePath);
  const headers = {
    "Content-Type": type,
    "Cache-Control": getCacheControl(filePath, type),
  };
  const method = (req.method || "GET").toUpperCase();
  const isHeadRequest = method === "HEAD";

  let info;
  try {
    info = await stat(filePath);
    headers["Last-Modified"] = info.mtime.toUTCString();
    const etag = `"${info.size}-${info.mtime.getTime()}"`;
    headers["ETag"] = etag;
    if (
      req.headers["if-none-match"] === etag ||
      (req.headers["if-modified-since"] &&
        new Date(req.headers["if-modified-since"]).getTime() >=
          info.mtime.getTime())
    ) {
      res.writeHead(304, headers);
      return res.end();
    }
  } catch {}

  const accept = req.headers["accept-encoding"] || "";
  const shouldGzip = /\bgzip\b/.test(accept);
  if (shouldGzip) {
    headers["Content-Encoding"] = "gzip";
  } else if (info) {
    headers["Content-Length"] = info.size;
  }

  if (isHeadRequest) {
    res.writeHead(status, headers);
    return res.end();
  }

  const stream = createReadStream(filePath).on("error", () => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  });
  res.writeHead(status, headers);
  if (shouldGzip) {
    stream.pipe(createGzip()).pipe(res);
  } else {
    stream.pipe(res);
  }
}

function extractRequestPath(rawTarget) {
  if (!rawTarget) return "/";
  let end = rawTarget.length;
  const queryIndex = rawTarget.indexOf("?");
  if (queryIndex !== -1) {
    end = Math.min(end, queryIndex);
  }
  const hashIndex = rawTarget.indexOf("#");
  if (hashIndex !== -1) {
    end = Math.min(end, hashIndex);
  }
  const path = rawTarget.slice(0, end);
  return path || "/";
}

function containsTraversalAttempt(rawPath) {
  if (!rawPath) return false;
  let candidate = rawPath;
  for (let i = 0; i < 4; i++) {
    const lower = candidate.toLowerCase();
    if (lower.includes("../") || lower.includes("..\\")) {
      return true;
    }
    const segments = lower.split(/[/\\]+/);
    if (segments.some((segment) => segment === "..")) {
      return true;
    }
    if (!lower.includes("%")) {
      break;
    }
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) {
        break;
      }
      candidate = decoded;
    } catch {
      break;
    }
  }
  return false;
}

async function respondNotFound(req, res) {
  const notFound = join(staticRoot, "404.html");
  try {
    await stat(notFound);
    await streamFile(req, res, notFound, 404);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}

async function tryServeSpaFallback(req, res, pathname) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  const accept = req.headers["accept"];
  let acceptsHtml = true;
  if (typeof accept === "string" && accept.trim() !== "") {
    const normalized = accept.toLowerCase();
    acceptsHtml = normalized.split(",").some((value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return false;
      }
      const [type] = trimmed.split(";", 1);
      const mediaType = type.trim();
      return (
        mediaType === "text/html" ||
        mediaType === "application/xhtml+xml" ||
        mediaType === "*/*"
      );
    });
  }
  if (!acceptsHtml) {
    return false;
  }

  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) {
    return false;
  }

  const fallbackPath = join(staticRoot, "index.html");
  try {
    await stat(fallbackPath);
    await streamFile(req, res, fallbackPath);
    return true;
  } catch {
    return false;
  }
}

function resolveStaticCandidates(pathname) {
  let target = pathname;
  if (target.startsWith("/_static")) {
    target = target.slice("/_static".length) || "/";
  }
  if (!target.startsWith("/")) {
    target = `/${target}`;
  }
  const trimmed = target.replace(/^\/+/, "");
  const candidates = new Set();
  if (!trimmed) {
    candidates.add("index.html");
  } else {
    candidates.add(trimmed);
    if (trimmed.endsWith("/")) {
      candidates.add(`${trimmed}index.html`);
    } else {
      candidates.add(`${trimmed}/index.html`);
    }
    if (!trimmed.endsWith(".html")) {
      candidates.add(`${trimmed}.html`);
    }
  }
  return Array.from(candidates);
}

async function tryServeStatic(req, res, pathname) {
  const candidates = resolveStaticCandidates(pathname);
  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    if (normalized.startsWith("..")) {
      continue;
    }
    const filePath = join(staticRoot, normalized);
    if (!filePath.startsWith(staticRoot)) {
      continue;
    }
    try {
      const info = await stat(filePath);
      if (info.isFile()) {
        await streamFile(req, res, filePath);
        return true;
      }
    } catch {}
  }
  return false;
}

async function handler(req, res) {
  const ip = req.socket.remoteAddress || "";
  const now = Date.now();
  let record = requestCounts.get(ip);
  if (!record || now - record.startTime > rateLimitWindowMs) {
    record = { count: 0, startTime: now };
  }
  record.count += 1;
  requestCounts.set(ip, record);
  if (record.count > maxRequestsPerWindow) {
    res.writeHead(429, { "Content-Type": "text/plain" });
    return res.end("Too Many Requests");
  }

  const forwardedHost = req.headers["x-forwarded-host"];
  const rawHost = (forwardedHost || req.headers.host || "").trim();
  let requestHost;
  if (rawHost) {
    try {
      requestHost = new URL(`http://${rawHost}`).hostname.toLowerCase();
    } catch {}
  }

  const isLoopbackHost = Boolean(
    requestHost &&
      (LOOPBACK_HOSTS.has(requestHost) ||
        LOOPBACK_PATTERNS.some((pattern) => pattern.test(requestHost))),
  );

  if (requestHost && requestHost !== CANONICAL_HOST && !isLoopbackHost) {
    let requestPath = req.url || "/";
    if (!requestPath.startsWith("/")) {
      try {
        const parsed = new URL(requestPath, CANONICAL_ORIGIN);
        requestPath = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
      } catch {
        requestPath = "/";
      }
    }
    const target = `${CANONICAL_ORIGIN}${requestPath || "/"}`;
    res.writeHead(301, {
      Location: target,
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/plain",
      Vary: "Host",
    });
    return res.end(`Redirecting to ${target}`);
  }

  // Enable CORS and security headers for all requests
  const origin = req.headers.origin;
  if (allowAllOrigins) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    res.setHeader("Vary", "Origin");
    if (origin && allowedOriginSet.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type, x-admin-secret, x-requested-with, accept, origin",
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const requestTarget = req.url || "/";
  const rawPath = extractRequestPath(requestTarget);
  if (containsTraversalAttempt(rawPath)) {
    console.warn(`Blocked path traversal attempt: ${rawPath}`);
    await respondNotFound(req, res);
    return;
  }

  const url = new URL(requestTarget, "http://localhost");
  const { pathname } = url;
  console.log(`${req.method} ${pathname}`);

  if (pathname === "/.well-known/health") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return res.end(`ok ${COMMIT_SHA}`);
  }

  if (pathname === "/healthz") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return res.end(`ok ${COMMIT_SHA}`);
  }

  if (await tryServeStatic(req, res, pathname)) {
    return;
  }

  if (await tryServeSpaFallback(req, res, pathname)) {
    return;
  }

  await respondNotFound(req, res);
}

let server;
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  const key = readFileSync(process.env.SSL_KEY_PATH);
  const cert = readFileSync(process.env.SSL_CERT_PATH);
  server = https.createServer({
    key,
    cert,
    minVersion: "TLSv1.2",
    maxVersion: "TLSv1.3",
  }, handler);
  console.log("HTTPS server enabled");
} else {
  server = http.createServer(handler);
}

server.listen(port, () => {
  console.log(`API service listening on port ${port}`);
});
