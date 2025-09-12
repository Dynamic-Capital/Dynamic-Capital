import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

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

function streamFile(res, filePath, status = 200) {
  const type = mime[extname(filePath)] || 'application/octet-stream';
  res.writeHead(status, { 'Content-Type': type });
  createReadStream(filePath).on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  console.log(`${req.method} ${url}`);

  if (url === '/' || url === '/index.html') {
    return streamFile(res, join(root, 'index.html'));
  }

  if (url.startsWith('/_static/')) {
    const filePath = join(root, url);
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) throw new Error('is directory');
      return streamFile(res, filePath);
    } catch {
      const notFound = join(staticRoot, '404.html');
      try {
        await stat(notFound);
        return streamFile(res, notFound, 404);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
    }
  }

  const notFound = join(staticRoot, '404.html');
  try {
    await stat(notFound);
    return streamFile(res, notFound, 404);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log(`API service listening on port ${port}`);
});
