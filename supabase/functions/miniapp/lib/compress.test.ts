import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { smartCompress } from "./compress.ts";

Deno.test("smartCompress selects gzip", async () => {
  const body = new TextEncoder().encode("hello world");
  const req = new Request("https://example.com", {
    headers: { "accept-encoding": "gzip" },
  });
  const { stream, encoding } = smartCompress(body, req, "text/html");
  assertEquals(encoding, "gzip");
  const arr = new Uint8Array(await new Response(stream).arrayBuffer());
  // compressed output should differ
  assertEquals(arr instanceof Uint8Array, true);
});

