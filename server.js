import http from 'node:http';
import https from 'node:https';
import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';

const port = process.env.PORT || 3000;
const root = process.cwd();
const staticRoot = join(root, '_static');

function coerceSiteUrl(raw) {
  if (!raw) return undefined;
  const trimmed = `${raw}`.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
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
    const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    return new URL(candidate).hostname;
  } catch {
    return undefined;
  }
}

const siteUrlSources = [
  ['SITE_URL', process.env.SITE_URL],
  ['NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL],
  ['URL', process.env.URL],
  ['APP_URL', process.env.APP_URL],
  ['PUBLIC_URL', process.env.PUBLIC_URL],
  ['DEPLOY_URL', process.env.DEPLOY_URL],
  ['DEPLOYMENT_URL', process.env.DEPLOYMENT_URL],
  ['DIGITALOCEAN_APP_URL', process.env.DIGITALOCEAN_APP_URL],
  [
    'DIGITALOCEAN_APP_SITE_DOMAIN',
    process.env.DIGITALOCEAN_APP_SITE_DOMAIN,
  ],
  [
    'VERCEL_URL',
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
  SITE_URL = 'http://localhost:3000';
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      'SITE_URL is not configured; defaulting to http://localhost:3000. Set SITE_URL or NEXT_PUBLIC_SITE_URL to your canonical domain.',
    );
  }
} else if (
  process.env.NODE_ENV === 'production' &&
  siteUrlSource &&
  !['SITE_URL', 'NEXT_PUBLIC_SITE_URL'].includes(siteUrlSource)
) {
  console.warn(
    `SITE_URL not provided. Using ${siteUrlSource} to derive ${SITE_URL}. Set SITE_URL to avoid fallback behaviour.`,
  );
}

const canonicalHostSources = [
  ['PRIMARY_HOST', process.env.PRIMARY_HOST],
  ['DIGITALOCEAN_APP_SITE_DOMAIN', process.env.DIGITALOCEAN_APP_SITE_DOMAIN],
  ['DIGITALOCEAN_APP_URL', process.env.DIGITALOCEAN_APP_URL],
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
  canonicalHostSource = canonicalHostSource ?? 'SITE_URL';
} else {
  const siteUrlHost = new URL(SITE_URL).hostname;
  if (siteUrlHost !== CANONICAL_HOST) {
    if (process.env.NODE_ENV === 'production') {
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

let allowedOrigins;
if (rawAllowedOrigins === undefined) {
  allowedOrigins = [defaultOrigin];
  if (!process.env.SITE_URL) {
    console.warn(
      `[CORS] ALLOWED_ORIGINS is missing; defaulting to ${defaultOrigin}`,
    );
  }
} else if (rawAllowedOrigins.trim() === '') {
  allowedOrigins = ['*'];
} else {
  allowedOrigins = rawAllowedOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    console.warn(
      `[CORS] ALLOWED_ORIGINS is empty; defaulting to ${defaultOrigin}`,
    );
    allowedOrigins = [defaultOrigin];
  }
}

if (!allowedOrigins.includes('*') && !allowedOrigins.includes(defaultOrigin)) {
  allowedOrigins.push(defaultOrigin);
}

const allowAllOrigins = allowedOrigins.includes('*');
const allowedOriginSet = new Set(allowedOrigins);
allowedOriginSet.delete('*');

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

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

async function streamFile(req, res, filePath, status = 200) {
  const type = mime[extname(filePath)] || 'application/octet-stream';
  const headers = { 'Content-Type': type };
  // Cache aggressively for hashed assets, otherwise require revalidation
  if (type === 'text/html') {
    headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
  } else {
    const hashed = /\.[0-9a-f]{8,}\./.test(filePath);
    headers['Cache-Control'] = hashed
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate';
  }
  let info;
  try {
    info = await stat(filePath);
    headers['Last-Modified'] = info.mtime.toUTCString();
    const etag = `"${info.size}-${info.mtime.getTime()}"`;
    headers['ETag'] = etag;
    if (
      req.headers['if-none-match'] === etag ||
      (req.headers['if-modified-since'] &&
        new Date(req.headers['if-modified-since']).getTime() >=
          info.mtime.getTime())
    ) {
      res.writeHead(304, headers);
      return res.end();
    }
  } catch {}

  const accept = req.headers['accept-encoding'] || '';
  const stream = createReadStream(filePath).on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  });
  if (/\bgzip\b/.test(accept)) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(status, headers);
    stream.pipe(createGzip()).pipe(res);
  } else {
    res.writeHead(status, headers);
    stream.pipe(res);
  }
}

function resolveStaticCandidates(pathname) {
  let target = pathname;
  if (target.startsWith('/_static')) {
    target = target.slice('/_static'.length) || '/';
  }
  if (!target.startsWith('/')) {
    target = `/${target}`;
  }
  const trimmed = target.replace(/^\/+/, '');
  const candidates = new Set();
  if (!trimmed) {
    candidates.add('index.html');
  } else {
    candidates.add(trimmed);
    if (trimmed.endsWith('/')) {
      candidates.add(`${trimmed}index.html`);
    } else {
      candidates.add(`${trimmed}/index.html`);
    }
    if (!trimmed.endsWith('.html')) {
      candidates.add(`${trimmed}.html`);
    }
  }
  return Array.from(candidates);
}

async function tryServeStatic(req, res, pathname) {
  const candidates = resolveStaticCandidates(pathname);
  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    if (normalized.startsWith('..')) {
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
  const ip = req.socket.remoteAddress || '';
  const now = Date.now();
  let record = requestCounts.get(ip);
  if (!record || now - record.startTime > rateLimitWindowMs) {
    record = { count: 0, startTime: now };
  }
  record.count += 1;
  requestCounts.set(ip, record);
  if (record.count > maxRequestsPerWindow) {
    res.writeHead(429, { 'Content-Type': 'text/plain' });
    return res.end('Too Many Requests');
  }

  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = (forwardedHost || req.headers.host || '').trim();
  let requestHost;
  if (rawHost) {
    try {
      requestHost = new URL(`http://${rawHost}`).hostname.toLowerCase();
    } catch {}
  }

  if (requestHost && requestHost !== CANONICAL_HOST) {
    let requestPath = req.url || '/';
    if (!requestPath.startsWith('/')) {
      try {
        const parsed = new URL(requestPath, CANONICAL_ORIGIN);
        requestPath = `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
      } catch {
        requestPath = '/';
      }
    }
    const target = `${CANONICAL_ORIGIN}${requestPath || '/'}`;
    res.writeHead(301, {
      Location: target,
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'text/plain',
      Vary: 'Host',
    });
    return res.end(`Redirecting to ${target}`);
  }

  // Enable CORS and security headers for all requests
  const origin = req.headers.origin;
  if (allowAllOrigins) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Vary', 'Origin');
    if (origin && allowedOriginSet.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, x-client-info, apikey, content-type, x-admin-secret, x-requested-with, accept, origin',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const { pathname } = url;
  console.log(`${req.method} ${pathname}`);

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }

  if (await tryServeStatic(req, res, pathname)) {
    return;
  }

  const notFound = join(staticRoot, '404.html');
  try {
    await stat(notFound);
    return await streamFile(req, res, notFound, 404);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

let server;
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  const key = readFileSync(process.env.SSL_KEY_PATH);
  const cert = readFileSync(process.env.SSL_CERT_PATH);
  server = https.createServer({
    key,
    cert,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
  }, handler);
  console.log('HTTPS server enabled');
} else {
  server = http.createServer(handler);
}

server.listen(port, () => {
  console.log(`API service listening on port ${port}`);
});
