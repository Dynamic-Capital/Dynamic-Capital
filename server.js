import http from 'node:http';

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('API service running\n');
});

server.listen(port, () => {
  console.log(`API service listening on port ${port}`);
});
