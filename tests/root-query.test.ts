import { assertEquals } from "jsr:@std/assert";
import { waitForServer } from "./utils/waitForServer.ts";

Deno.test('redirects root path with query string to /_static/index.html', async () => {
  const command = new Deno.Command('node', {
    args: ['server.js'],
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...Deno.env.toObject(), PORT: '8124' }
  });
  const child = command.spawn();
  try {
    await waitForServer(8124);
    const res = await fetch('http://localhost:8124/?foo=bar', {
      redirect: 'manual',
    });
    assertEquals(res.status, 302);
    assertEquals(res.headers.get('location'), '/_static/index.html?foo=bar');
    await res.arrayBuffer();
  } finally {
    child.kill('SIGTERM');
    await child.status;
  }
});
