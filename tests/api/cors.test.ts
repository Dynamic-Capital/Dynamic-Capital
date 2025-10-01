import assert from "node:assert/strict";

Deno.env.set("ALLOWED_ORIGINS", "https://allowed.com");
const { corsHeaders } = await import(
  /* @vite-ignore */ "../../apps/web/utils/http.ts"
);

Deno.test("allowed origin receives CORS header", () => {
  const req = new Request("http://localhost", {
    headers: { origin: "https://allowed.com" },
  });
  const headers = corsHeaders(req);
  assert.equal(headers["access-control-allow-origin"], "https://allowed.com");
});

Deno.test("disallowed origin is rejected", () => {
  const req = new Request("http://localhost", {
    headers: { origin: "https://denied.com" },
  });
  const headers = corsHeaders(req);
  assert.ok(!("access-control-allow-origin" in headers));
});

Deno.test("preflight includes allowed methods", () => {
  const req = new Request("http://localhost", {
    headers: { origin: "https://allowed.com" },
  });
  const headers = corsHeaders(req, "GET,POST");
  assert.equal(headers["access-control-allow-methods"], "GET,POST");
});
