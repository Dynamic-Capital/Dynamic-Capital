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

Deno.env.set("NO_PROXY", "localhost,127.0.0.1,::1");
Deno.env.set("no_proxy", "localhost,127.0.0.1,::1");

Deno.test("serves landing page from root even with query string", async () => {
  const command = new Deno.Command("node", {
    args: ["server.js"],
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...Deno.env.toObject(),
      NO_PROXY: "localhost,127.0.0.1,::1",
      no_proxy: "localhost,127.0.0.1,::1",
      PORT: "8124",
    },
  });
  const child = command.spawn();
  try {
    await waitForServer("http://127.0.0.1:8124/healthz");
    const res = await fetch("http://127.0.0.1:8124/?foo=bar", {});
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type"), "text/html");
    const body = await res.text();
    if (!body.includes("<!DOCTYPE html>")) {
      throw new Error("Root response did not include HTML doctype");
    }
    const legacy = await fetch("http://127.0.0.1:8124/_static/index.html");
    assertEquals(legacy.status, 200);
    await legacy.arrayBuffer();
  } finally {
    child.kill("SIGTERM");
    await child.status;
  }
});
