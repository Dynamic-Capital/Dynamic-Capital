import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { resolveTargets } from "../src/broadcast/index.ts";

Deno.test("resolveTargets accepts array", async () => {
  const ids = await resolveTargets([1, 2]);
  assertEquals(ids, [1, 2]);
});

Deno.test("resolveTargets accepts object with userIds", async () => {
  const ids = await resolveTargets({ userIds: [3, 4] });
  assertEquals(ids, [3, 4]);
});

Deno.test("resolveTargets rejects invalid input", async () => {
  await assertRejects(
    () => resolveTargets({ foo: "bar" } as unknown as number[]),
    Error,
    "Invalid broadcast segment",
  );
});
