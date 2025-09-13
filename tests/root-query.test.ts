import { assertEquals } from "jsr:@std/assert";

Deno.test('serves index.html for root path with query string', async () => {
  const command = new Deno.Command('node', {
    args: ['server.js'],
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...Deno.env.toObject(), PORT: '8124' }
  });
  const child = command.spawn();
  try {
    await new Promise((r) => setTimeout(r, 200));
    const res = await fetch('http://localhost:8124/?foo=bar');
    assertEquals(res.status, 200);
    await res.arrayBuffer();
  } finally {
    child.kill('SIGTERM');
    await child.status;
  }
});
