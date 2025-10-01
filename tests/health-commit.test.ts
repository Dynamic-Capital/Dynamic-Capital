if (typeof Deno !== "undefined") {
  const { assertEquals } = await import(
    "https://deno.land/std@0.224.0/assert/mod.ts"
  );
  const { COMMIT_ENV_KEYS } = await import("../apps/web/utils/commit.ts");

  type CommitEnvKey = (typeof COMMIT_ENV_KEYS)[number];

  function ensureProcessEnv() {
    const g = globalThis as {
      process?: { env?: Record<string, string | undefined> };
    };
    if (!g.process) {
      g.process = { env: {} };
    }
    if (!g.process.env) {
      g.process.env = {};
    }
    return g.process.env as Record<string, string | undefined>;
  }

  async function withCommitEnvCleared(run: () => Promise<void>) {
    const processEnv = ensureProcessEnv();
    const originalNode = new Map<CommitEnvKey, string | undefined>();
    const originalDeno = new Map<CommitEnvKey, string | undefined>();

    for (const key of COMMIT_ENV_KEYS) {
      originalNode.set(key, processEnv[key]);
      delete processEnv[key];

      let denoValue: string | undefined;
      try {
        denoValue = Deno.env.get(key) ?? undefined;
      } catch {
        denoValue = undefined;
      }
      originalDeno.set(key, denoValue);

      try {
        Deno.env.delete(key);
      } catch {
        // ignore keys that were not set
      }
    }

    try {
      await run();
    } finally {
      const restoredEnv = ensureProcessEnv();
      for (const [key, value] of originalNode) {
        if (value === undefined) {
          delete restoredEnv[key];
        } else {
          restoredEnv[key] = value;
        }
      }

      for (const [key, value] of originalDeno) {
        if (value === undefined) {
          try {
            Deno.env.delete(key);
          } catch {
            // ignore
          }
        } else {
          Deno.env.set(key, value);
        }
      }
    }
  }

  Deno.test("health payload defaults commit to dev when env missing", async () => {
    await withCommitEnvCleared(async () => {
      const { healthPayload } = await import(
        `../apps/web/utils/commit.ts?cache=${crypto.randomUUID()}`
      );
      const payload = healthPayload();
      assertEquals(payload.status, "ok");
      assertEquals(payload.commit, "dev");
    });
  });

  Deno.test("health payload prefers NEXT_PUBLIC_COMMIT_SHA when present", async () => {
    await withCommitEnvCleared(async () => {
      const processEnv = ensureProcessEnv();
      Deno.env.set("COMMIT_SHA", "commit-sha");
      processEnv.COMMIT_SHA = "commit-sha";
      Deno.env.set("NEXT_PUBLIC_COMMIT_SHA", "public-sha");
      processEnv.NEXT_PUBLIC_COMMIT_SHA = "public-sha";

      const { healthPayload } = await import(
        `../apps/web/utils/commit.ts?cache=${crypto.randomUUID()}`
      );
      const payload = healthPayload();
      assertEquals(payload.status, "ok");
      assertEquals(payload.commit, "public-sha");
    });
  });
} else {
  const { default: test } = await import("node:test");
  test.skip("health payload defaults commit to dev when env missing (Deno only)", () => {});
  test.skip("health payload prefers NEXT_PUBLIC_COMMIT_SHA when present (Deno only)", () => {});
}
