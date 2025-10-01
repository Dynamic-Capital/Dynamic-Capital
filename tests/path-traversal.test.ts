import { assertEquals } from "std/assert/mod.ts";

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

Deno.test("blocks path traversal in _static", async () => {
  const command = new Deno.Command("node", {
    args: ["server.js"],
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...Deno.env.toObject(), PORT: "8123" },
  });
  const child = command.spawn();
  try {
    await waitForServer("http://localhost:8123/healthz");
    const attempts = [
      "/_static/../server.js",
      "/_static/%2e%2e/server.js",
      "/_static/%2e%2e%2fserver.js",
      "/_static/%2e%2e%5cserver.js",
      "/_static/%252e%252e%252fserver.js",
    ];
    for (const path of attempts) {
      const res = await fetch(`http://localhost:8123${path}`);
      assertEquals(res.status, 404);
      await res.arrayBuffer(); // drain body to avoid leaks
    }
  } finally {
    child.kill("SIGTERM");
    await child.status;
  }
});
