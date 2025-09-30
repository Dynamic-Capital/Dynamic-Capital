import { assertEquals, assert } from "std/testing/asserts.ts";
import handler from "../payments-auto-review/index.ts";

Deno.test("payments-auto-review exposes version", async () => {
  const res = await handler(new Request("https://example.com/version", { method: "GET" }));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.name, "payments-auto-review");
  assert(typeof body.ts === "string" && body.ts.length > 0);
});
