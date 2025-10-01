import test from "node:test";
import { equal as assertEquals, ok as assert } from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

const globalAny = globalThis as any;
const supaState: any = { tables: {} };
globalAny.__SUPA_MOCK__ = supaState;
if (!globalAny.Deno) {
  globalAny.Deno = {
    env: { get: (name: string) => process.env[name] ?? "" },
    readTextFile: (path: string) => readFile(path, "utf8"),
    readFile,
  };
}

if (globalAny.Deno?.env?.set) {
  globalAny.Deno.env.set("SUPABASE_URL", "http://localhost");
  globalAny.Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service");
  globalAny.Deno.env.set("SUPABASE_ANON_KEY", "anon");
} else {
  process.env.SUPABASE_URL = "http://localhost";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.SUPABASE_ANON_KEY = "anon";
}

const { default: handler } = await import(
  /* @vite-ignore */ "../supabase/functions/miniapp/index.ts"
);

function serve(
  handler: (req: Request) => Response | Promise<Response>,
  { signal }: { signal: AbortSignal },
) {
  const server = createServer(async (req, res) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(chunk as Uint8Array);
    const body = Buffer.concat(chunks);
    const request = new Request(`http://localhost:8000${req.url}`, {
      method: req.method,
      headers: req.headers as any,
      body: body.length ? body : undefined,
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  });
  server.listen(8000);
  signal.addEventListener("abort", () => server.close());
}

test.skip("miniapp edge host routes", async () => {
  const controller = new AbortController();
  serve(handler, { signal: controller.signal });
  const base = "http://localhost:8000";

  await rm("supabase/functions/miniapp/static/assets/app.css", { force: true })
    .catch(() => {});

  const resRoot = await fetch(`${base}/miniapp/`);
  assertEquals(resRoot.status, 200);
  assertEquals(
    resRoot.headers.get("content-type")?.toLowerCase(),
    "text/html; charset=utf-8",
  );
  const bodyRoot = await resRoot.text();
  assert(
    !bodyRoot.includes("Static <code>index.html</code> not found"),
    "should not serve fallback HTML",
  );

  // Supabase's default host rewrites use /functions/v1/miniapp; ensure it also works
  const resRootV1 = await fetch(`${base}/functions/v1/miniapp/`);
  assertEquals(resRootV1.status, 200);
  await resRootV1.arrayBuffer();

  const resVersion = await fetch(`${base}/miniapp/version`);
  assertEquals(resVersion.status, 200);
  const bodyVersion = await resVersion.json();
  assert(typeof bodyVersion === "object" && bodyVersion);

  const resVersionV1 = await fetch(`${base}/functions/v1/miniapp/version`);
  assertEquals(resVersionV1.status, 200);
  await resVersionV1.arrayBuffer();

  const resHeadVersion = await fetch(`${base}/miniapp/version`, {
    method: "HEAD",
  });
  assertEquals(resHeadVersion.status, 200);
  assertEquals(
    resHeadVersion.headers.get("x-content-type-options"),
    "nosniff",
  );
  await resHeadVersion.arrayBuffer();

  const resHead = await fetch(`${base}/miniapp/`, { method: "HEAD" });
  assertEquals(resHead.status, 200);
  assertEquals(resHead.headers.get("x-content-type-options"), "nosniff");
  await resHead.arrayBuffer();

  const resHeadV1 = await fetch(`${base}/functions/v1/miniapp/`, {
    method: "HEAD",
  });
  assertEquals(resHeadV1.status, 200);
  await resHeadV1.arrayBuffer();

  await mkdir("supabase/functions/miniapp/static/assets", { recursive: true });
  await writeFile("supabase/functions/miniapp/static/assets/app.css", "body{}");
  const resCss = await fetch(`${base}/assets/app.css`);
  assertEquals(resCss.status, 200);
  assert(
    resCss.headers.get("content-type")?.toLowerCase().startsWith("text/css"),
  );
  await resCss.arrayBuffer();

  const resNope = await fetch(`${base}/nope`);
  assertEquals(resNope.status, 404);
  await resNope.arrayBuffer();

  const resPost = await fetch(`${base}/miniapp/`, { method: "POST" });
  assertEquals(resPost.status, 405);
  await resPost.arrayBuffer();

  controller.abort();
  await rm("supabase/functions/miniapp/static/assets/app.css", { force: true })
    .catch(() => {});
});
