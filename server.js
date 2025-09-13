import http from 'node:http';
import https from 'node:https';
import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = process.env.PORT || 3000;
const root = process.cwd();
const staticRoot = join(root, '_static');

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

async function streamFile(res, filePath, status = 200) {
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
  try {
    const info = await stat(filePath);
    headers['Last-Modified'] = info.mtime.toUTCString();
  } catch {}
  res.writeHead(status, headers);
  createReadStream(filePath)
    .on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    })
    .pipe(res);
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

  // Enable CORS and security headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const { pathname, search } = url;
  console.log(`${req.method} ${pathname}`);

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }

  if (pathname === '/' || pathname === '/index.html') {
    const location = '/_static/index.html' + search;
    res.writeHead(302, { Location: location });
    return res.end();
  }

  if (pathname.startsWith('/_static/')) {
    const normalizedUrl = normalize(pathname);
    const filePath = join(root, normalizedUrl.slice(1));
    if (!filePath.startsWith(staticRoot)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) throw new Error('is directory');
      return await streamFile(res, filePath);
    } catch {
      const notFound = join(staticRoot, '404.html');
      try {
        await stat(notFound);
        return await streamFile(res, notFound, 404);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
    }
  }

  const notFound = join(staticRoot, '404.html');
  try {
    await stat(notFound);
    return await streamFile(res, notFound, 404);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

let server;
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  const key = readFileSync(process.env.SSL_KEY_PATH);
  const cert = readFileSync(process.env.SSL_CERT_PATH);
  server = https.createServer({ key, cert, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' }, handler);
  console.log('HTTPS server enabled');
} else {
  server = http.createServer(handler);
}

server.listen(port, () => {
  console.log(`API service listening on port ${port}`);
});
