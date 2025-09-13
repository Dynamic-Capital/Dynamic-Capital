import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = process.env.PORT || 3000;
const root = process.cwd();
const staticRoot = join(root, '_static');

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

const server = http.createServer(async (req, res) => {
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const { pathname } = new URL(req.url || '/', 'http://localhost');
  console.log(`${req.method} ${pathname}`);

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }

  if (pathname === '/' || pathname === '/index.html') {
    return await streamFile(res, join(root, 'index.html'));
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
});

server.listen(port, () => {
  console.log(`API service listening on port ${port}`);
});
