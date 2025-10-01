import { assertEquals } from "std/assert/mod.ts";

Deno.test("health function responds with commit", async () => {
  const commit = "test-health-sha";
  Deno.env.set("COMMIT_SHA", commit);
  const g = globalThis as { process?: { env: Record<string, string> } };
  if (!g.process) g.process = { env: {} };
  g.process.env.COMMIT_SHA = commit;

  const { handler } = await import(
    `../health/index.ts?cache=${crypto.randomUUID()}`
  );

  const res = await handler(
    new Request("http://localhost/functions/v1/health"),
  );
  assertEquals(res.status, 200);
  const body = await res.json() as { status: string; commit: string };
  assertEquals(body.status, "ok");
  assertEquals(body.commit, commit);

  Deno.env.delete("COMMIT_SHA");
  delete g.process.env.COMMIT_SHA;
});
