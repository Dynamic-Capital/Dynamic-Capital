import test from "node:test";
import { deepEqual, equal, rejects } from "node:assert/strict";
import { freshImport } from "./utils/freshImport.ts";
import { withEnv } from "./utils/withEnv.ts";

const CONFIG_DISABLED = /Supabase configuration is missing/;

type GlobalTestScope = typeof globalThis & {
  window?: { location?: { origin?: string } };
};

test("utils/config falls back to defaults when Supabase env vars are missing", async () => {
  await withEnv({
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
  }, async () => {
    const { configClient } = await freshImport(
      new URL("../apps/web/utils/config.ts", import.meta.url),
    );
    equal(await configClient.getFlag("test_feature", true), true);
    await rejects(configClient.setFlag("test_feature", true), CONFIG_DISABLED);
  });
});

test("known feature flags default to enabled", async () => {
  await withEnv({
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
  }, async () => {
    const { configClient } = await freshImport(
      new URL("../apps/web/utils/config.ts", import.meta.url),
    );
    equal(await configClient.getFlag("broadcasts_enabled"), true);
  });
});

test("utils/config rejects null-like env values", async () => {
  await withEnv({
    SUPABASE_URL: "null",
    SUPABASE_ANON_KEY: "undefined",
  }, async () => {
    const { configClient } = await freshImport(
      new URL("../apps/web/utils/config.ts", import.meta.url),
    );
    equal(await configClient.getFlag("test_feature", false), false);
    await rejects(configClient.publish(), CONFIG_DISABLED);
  });
});

test(
  "utils/config proxies through internal API when browser origin is available",
  async () => {
    await withEnv({
      SUPABASE_URL: undefined,
      SUPABASE_ANON_KEY: undefined,
      SITE_URL: undefined,
      NEXT_PUBLIC_SITE_URL: undefined,
    }, async () => {
      const globalTestScope = globalThis as GlobalTestScope;
      const originalWindow = globalTestScope.window;
      const originalFetch = globalThis.fetch;
      const origin = "https://app.example.com";
      const fetchCalls: Array<
        { input: unknown; init?: { headers?: Record<string, string> } }
      > = [];

      globalTestScope.window = { location: { origin } };
      globalThis.fetch = async (input, init) => {
        fetchCalls.push({ input, init });
        return new Response(JSON.stringify({ data: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      try {
        const { getFlag, setFlag } = await freshImport(
          new URL("../apps/web/utils/config.ts", import.meta.url),
        );

        equal(await getFlag("test_feature", false), true);
        equal(fetchCalls.length, 1);
        equal(String(fetchCalls[0]?.input), `${origin}/api/functions/config`);

        const headers = new Headers(fetchCalls[0]?.init?.headers);
        equal(headers.get("apikey"), null);
        equal(headers.get("Authorization"), null);

        await setFlag("test_feature", true);
        equal(fetchCalls.length, 2);
      } finally {
        globalThis.fetch = originalFetch;
        if (originalWindow === undefined) {
          delete globalTestScope.window;
        } else {
          globalTestScope.window = originalWindow;
        }
      }
    });
  },
);

test("supabase runtime accepts NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY alias", async () => {
  await withEnv({
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
  }, async () => {
    const module = await freshImport(
      new URL("../apps/web/config/supabase-runtime.ts", import.meta.url),
    );

    equal(module.SUPABASE_URL, "https://example.supabase.co");
    equal(module.SUPABASE_ANON_KEY, "publishable");
    equal(module.SUPABASE_CONFIG_FROM_ENV, true);
  });
});

test("web env accepts Supabase publishable key aliases", async () => {
  await withEnv({
    NODE_ENV: "test",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: undefined,
    SUPABASE_PUBLISHABLE_KEY: "publishable-server",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    SUPABASE_SERVICE_ROLE: "service-role",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-client",
  }, async () => {
    const module = await freshImport(
      new URL("../apps/web/lib/env.ts", import.meta.url),
    );

    equal(module.runtimeEnv.success, true);
    equal(
      module.runtimeEnv.missing.public.includes(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ),
      false,
    );
    equal(
      module.runtimeEnv.missing.server.includes("SUPABASE_ANON_KEY"),
      false,
    );
  });
});

test("web env accepts Vite Supabase aliases", async () => {
  await withEnv({
    NODE_ENV: "test",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "vite-publishable",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    SUPABASE_SERVICE_ROLE: "service-role",
  }, async () => {
    const module = await freshImport(
      new URL("../apps/web/lib/env.ts", import.meta.url),
    );

    equal(module.runtimeEnv.success, true);
    equal(module.runtimeEnv.missing.public.length, 0);
    equal(module.runtimeEnv.missing.server.length, 0);
  });
});

test("supabase env keys remain the single source of alias truth", async () => {
  const module = await freshImport(
    new URL("../apps/web/config/supabase-runtime.ts", import.meta.url),
  );

  deepEqual(
    Array.from(module.SUPABASE_ENV_KEYS.publicUrl.aliases),
    Array.from(module.SUPABASE_PUBLIC_URL_ALIASES),
  );
  deepEqual(
    Array.from(module.SUPABASE_ENV_KEYS.serverUrl.aliases),
    Array.from(module.SUPABASE_SERVER_URL_ALIASES),
  );
  deepEqual(
    Array.from(module.SUPABASE_ENV_KEYS.publicAnonKey.aliases),
    Array.from(module.SUPABASE_PUBLIC_ANON_ALIASES),
  );
  deepEqual(
    Array.from(module.SUPABASE_ENV_KEYS.serverAnonKey.aliases),
    Array.from(module.SUPABASE_SERVER_ANON_ALIASES),
  );
});

test("readSupabaseEnv resolves aliases consistently", async () => {
  await withEnv({
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
    NEXT_PUBLIC_SUPABASE_URL: "https://alias.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "publishable-alias",
  }, async () => {
    const module = await freshImport(
      new URL("../apps/web/config/supabase-runtime.ts", import.meta.url),
    );

    equal(module.readSupabaseEnv("publicUrl"), "https://alias.supabase.co");
    equal(module.readSupabaseEnv("serverUrl"), "https://alias.supabase.co");
    equal(module.readSupabaseEnv("publicAnonKey"), "publishable-alias");
    equal(module.readSupabaseEnv("serverAnonKey"), "publishable-alias");
  });
});
