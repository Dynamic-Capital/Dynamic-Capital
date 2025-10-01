import assert from "node:assert/strict";
import { freshImport } from "../utils/freshImport.ts";

Deno.test("missing ALLOWED_ORIGINS defaults to site URL", async () => {
  Deno.env.delete("ALLOWED_ORIGINS");
  const { corsHeaders } = await freshImport(
    new URL("../../apps/web/utils/http.ts", import.meta.url),
  );
  const origin = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
  const req = new Request("http://localhost", {
    headers: { origin },
  });
  const headers = corsHeaders(req);
  assert.equal(headers["access-control-allow-origin"], origin);
});
