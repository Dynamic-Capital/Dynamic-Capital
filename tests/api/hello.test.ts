import assert from "node:assert/strict";

async function run() {
  const { GET } = await import(
    /* @vite-ignore */ "../../apps/web/app/api/hello/route.ts"
  );
  const res = await GET();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { message: "Hello from the API" });
}

if (typeof Deno !== "undefined") {
  Deno.test("GET /api/hello returns greeting", run);
} else {
  const { default: test } = await import(/* @vite-ignore */ "node:test");
  test("GET /api/hello returns greeting", run);
}
