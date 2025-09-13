import { assertEquals } from "jsr:@std/assert";

Deno.test('redirects root path with query string to /app', async () => {
  const command = new Deno.Command('node', {
    args: ['server.js'],
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...Deno.env.toObject(), PORT: '8124' }
  });
  const child = command.spawn();
  try {
    await new Promise((r) => setTimeout(r, 200));
    const res = await fetch('http://localhost:8124/?foo=bar', {
      redirect: 'manual',
    });
    assertEquals(res.status, 302);
    assertEquals(res.headers.get('location'), '/app?foo=bar');
    await res.arrayBuffer();
  } finally {
    child.kill('SIGTERM');
    await child.status;
  }
});
