import { assertEquals } from "jsr:@std/assert";

async function waitForServer(url: string, retries = 20, delayMs = 100) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      await res.arrayBuffer();
      if (res.ok) return;
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Server at ${url} did not become ready`);
}

Deno.test('redirects root path with query string to /_static/index.html', async () => {
  const command = new Deno.Command('node', {
    args: ['server.js'],
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...Deno.env.toObject(), PORT: '8124' }
  });
  const child = command.spawn();
  try {
    await waitForServer('http://localhost:8124/healthz');
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
