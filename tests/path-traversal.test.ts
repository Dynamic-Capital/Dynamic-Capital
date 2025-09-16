import { assertEquals } from "jsr:@std/assert";

async function waitForServer(url: string, retries = 20, delayMs = 100) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      await res.arrayBuffer();
      if (res.ok) return;
    } catch {
      // swallow until retries exhausted
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Server at ${url} did not become ready`);
}

Deno.test('blocks path traversal in _static', async () => {
  const command = new Deno.Command('node', {
    args: ['server.js'],
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...Deno.env.toObject(), PORT: '8123' }
  });
  const child = command.spawn();
  try {
    await waitForServer('http://localhost:8123/healthz');
    const res = await fetch('http://localhost:8123/_static/../server.js');
    assertEquals(res.status, 404);
    await res.arrayBuffer(); // drain body to avoid leaks
  } finally {
    child.kill('SIGTERM');
    await child.status;
  }
});
