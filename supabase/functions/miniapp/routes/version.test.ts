import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { versionResponse } from "./version.ts";

Deno.test("versionResponse returns json", async () => {
  const req = new Request("https://example.com/miniapp/version", {
    headers: { "accept-encoding": "" },
  });
  const resp = versionResponse(req);
  assertEquals(resp.headers.get("content-type"), "application/json; charset=utf-8");
  const data = await resp.json();
  assertEquals(data.name, "miniapp");
});

