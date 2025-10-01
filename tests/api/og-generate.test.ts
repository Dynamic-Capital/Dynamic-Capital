import assert from "node:assert/strict";

async function run() {
  const { GET } = await import(
    /* @vite-ignore */ "../../apps/web/app/api/og/generate/route.ts"
  );

  const request = new Request(
    "http://localhost/api/og/generate?title=Desk%20Signals&description=Edge%20automation",
  );

  const response = await GET(request);
  assert.equal(response.status, 200);

  const contentType = response.headers.get("content-type") ?? "";
  assert(
    contentType.startsWith("image/png") ||
      contentType.startsWith("image/svg+xml"),
    `expected an image response, received ${contentType}`,
  );

  const body = await response.arrayBuffer();
  assert(body.byteLength > 200, "image payload should not be empty");
}

if (typeof Deno !== "undefined") {
  Deno.test("GET /api/og/generate returns an image", run);
} else {
  const { default: test } = await import(/* @vite-ignore */ "node:test");
  test("GET /api/og/generate returns an image", run);
}
