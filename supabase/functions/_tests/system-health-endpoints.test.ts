(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import {
  assert,
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

const BASE_ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  SUPABASE_PROJECT_ID: "project",
  TELEGRAM_BOT_TOKEN: "1234:ABCDEF",
  TELEGRAM_WEBHOOK_SECRET: "secret-token",
  MINI_APP_URL: "https://mini.example/",
  ADMIN_API_SECRET: "admin-secret",
} as const;

function withTestEnv<T>(
  overrides: Partial<typeof BASE_ENV>,
  fn: () => Promise<T>,
): Promise<T> {
  setTestEnv({ ...BASE_ENV, ...overrides });
  return fn().finally(() => {
    clearTestEnv();
  });
}

Deno.test(
  "system health: miniapp exposes HEAD check and version payload",
  async () => {
    await withTestEnv({}, async () => {
      const { default: handler } = await import(
        `../miniapp/index.ts?cache=${crypto.randomUUID()}`
      );
      const host = "https://project.functions.supabase.co";

      const headRes = await handler(
        new Request(`${host}/miniapp`, { method: "HEAD" }),
      );
      assertEquals(headRes.status, 200);

      const versionRes = await handler(new Request(`${host}/miniapp/version`));
      assertEquals(versionRes.status, 200);
      const versionPayload = await versionRes.json() as {
        name: string;
        ts: string;
        serveFromStorage: boolean;
        htmlCompressionDisabled: boolean;
      };
      assertEquals(versionPayload.name, "miniapp");
      assertMatch(versionPayload.ts, /T/);
      assertEquals(typeof versionPayload.serveFromStorage, "boolean");
      assertEquals(typeof versionPayload.htmlCompressionDisabled, "boolean");
    });
  },
);

Deno.test("system health: linkage-audit reports project linkage", async () => {
  await withTestEnv({}, async () => {
    const { default: handler } = await import(
      `../linkage-audit/index.ts?cache=${crypto.randomUUID()}`
    );
    const res = await handler(
      new Request("https://project.functions.supabase.co/linkage-audit"),
    );
    assertEquals(res.status, 200);
    const payload = await res.json() as {
      ok: boolean;
      linkage: {
        projectRef: string;
        expectedWebhookUrl: string | null;
        env: Record<string, boolean>;
      };
    };
    assertEquals(payload.ok, true);
    assertEquals(payload.linkage.projectRef, "project");
    assertEquals(
      payload.linkage.expectedWebhookUrl,
      "https://project.functions.supabase.co/telegram-bot",
    );
    assertEquals(payload.linkage.env.TELEGRAM_BOT_TOKEN, true);
    assertEquals(payload.linkage.env.SUPABASE_URL, true);
  });
});

Deno.test("system health: telegram-getwebhook surfaces diagnostics", async () => {
  await withTestEnv({}, async () => {
    const baseFetch = globalThis.fetch;
    const requests: Array<{ url: string; method: string }> = [];
    globalThis.fetch = async (
      input: Request | string | URL,
      init?: RequestInit,
    ) => {
      const url = typeof input === "string" || input instanceof URL
        ? input.toString()
        : input.url;
      const method = input instanceof Request
        ? input.method
        : init?.method ?? "GET";
      requests.push({ url, method });
      return new Response(
        JSON.stringify({ ok: true, result: { pending_update_count: 0 } }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    try {
      const { default: handler } = await import(
        `../telegram-getwebhook/index.ts?cache=${crypto.randomUUID()}`
      );
      const res = await handler(
        new Request(
          "https://project.functions.supabase.co/telegram-getwebhook",
        ),
      );
      assertEquals(res.status, 200);
      const payload = await res.json() as {
        ok: boolean;
        expected_url: string;
        has_secret: boolean;
        token_preview: string;
        webhook_info: { ok: boolean };
      };
      assertEquals(payload.ok, true);
      assertEquals(
        payload.expected_url,
        "https://project.functions.supabase.co/telegram-bot",
      );
      assertEquals(payload.has_secret, true);
      assertEquals(payload.token_preview, "1234...redacted");
      assertEquals(Array.isArray(requests) && requests.length > 0, true);
      assert(
        requests.some((req) =>
          req.url === "https://api.telegram.org/bot1234:ABCDEF/getWebhookInfo"
        ),
        "expected webhook info request",
      );
    } finally {
      globalThis.fetch = baseFetch;
    }
  });
});

Deno.test("system health: sync-audit probes related endpoints", async () => {
  await withTestEnv({}, async () => {
    const baseFetch = globalThis.fetch;
    const requests: Array<{ url: string; method: string }> = [];
    globalThis.fetch = async (
      input: Request | string | URL,
      init?: RequestInit,
    ) => {
      const url = typeof input === "string" || input instanceof URL
        ? input.toString()
        : input.url;
      const method = input instanceof Request
        ? input.method
        : init?.method ?? "GET";
      requests.push({ url, method });
      if (url.endsWith("/telegram-bot/version")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/miniapp/version")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/miniapp")) {
        return new Response(null, { status: 200 });
      }
      if (url.includes("getWebhookInfo")) {
        return new Response(
          JSON.stringify({ ok: true, result: { url: "https://old.example" } }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      if (url.includes("getChatMenuButton")) {
        return new Response(
          JSON.stringify({ ok: true, result: { menu_button: {} } }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const denoAny = Deno as unknown as { serve: typeof Deno.serve };
    const originalServe = denoAny.serve;
    denoAny.serve = ((..._args: unknown[]) => ({
      finished: Promise.resolve(),
      addr: { hostname: "0.0.0.0", port: 0, transport: "tcp" as const },
      async shutdown() {},
    })) as typeof Deno.serve;

    try {
      const { default: handler } = await import(
        `../sync-audit/index.ts?cache=${crypto.randomUUID()}`
      );

      const versionRes = await handler(
        new Request("https://project.functions.supabase.co/version"),
      );
      assertEquals(versionRes.status, 200);

      const res = await handler(
        new Request("https://project.functions.supabase.co/", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-admin-secret": "admin-secret",
          },
          body: JSON.stringify({ dry_run: true }),
        }),
      );
      assertEquals(res.status, 200);
      const payload = await res.json() as {
        ok: boolean;
        endpoints: {
          telegramBotVersion: boolean;
          miniappVersion: boolean;
          miniappHead: boolean;
        };
        secrets: Record<string, boolean>;
      };
      assertEquals(payload.endpoints.telegramBotVersion, true);
      assertEquals(payload.endpoints.miniappVersion, true);
      assertEquals(payload.endpoints.miniappHead, true);
      assertEquals(payload.secrets.TELEGRAM_BOT_TOKEN, true);
      assert(
        requests.some((req) =>
          req.url ===
            "https://project.functions.supabase.co/telegram-bot/version"
        ),
        "should probe telegram-bot/version",
      );
      assert(
        requests.some((req) =>
          req.url === "https://project.functions.supabase.co/miniapp/version"
        ),
        "should probe miniapp/version",
      );
      assert(
        requests.some((req) =>
          req.url === "https://project.functions.supabase.co/miniapp" &&
          req.method === "HEAD"
        ),
        "should probe miniapp HEAD",
      );
    } finally {
      denoAny.serve = originalServe;
      globalThis.fetch = baseFetch;
    }
  });
});
