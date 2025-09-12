import { assertEquals } from "jsr:@std/assert";

Deno.test('blocks path traversal in _static', async () => {
  const command = new Deno.Command('node', {
    args: ['server.js'],
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...Deno.env.toObject(), PORT: '8123' }
  });
  const child = command.spawn();
  try {
    // Wait briefly for the server to start
    await new Promise((r) => setTimeout(r, 200));
    const res = await fetch('http://localhost:8123/_static/../server.js');
    assertEquals(res.status, 404);
    await res.arrayBuffer(); // drain body to avoid leaks
  } finally {
    child.kill('SIGTERM');
    await child.status;
  }
});
