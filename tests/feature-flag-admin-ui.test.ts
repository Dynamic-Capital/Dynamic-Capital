import test from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { TextDecoder } from "node:util";

import { freshImport } from "./utils/freshImport.ts";
import { withEnv } from "./utils/withEnv.ts";

const SUPABASE_FUNCTION_HOST =
  "https://qeejuomcapbdlhnjqjcc.functions.supabase.co";

async function parseJsonBody(body: unknown): Promise<Record<string, unknown>> {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    return JSON.parse(body);
  }

  if (body instanceof ArrayBuffer) {
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(new Uint8Array(body)));
  }

  if (ArrayBuffer.isView(body)) {
    const decoder = new TextDecoder();
    const view = body as ArrayBufferView;
    return JSON.parse(
      decoder.decode(
        new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
      ),
    );
  }

  if (typeof body === "object" && body !== null) {
    if (typeof (body as ReadableStream).getReader === "function") {
      const text = await new Response(body as BodyInit).text();
      return text ? JSON.parse(text) : {};
    }

    return body as Record<string, unknown>;
  }

  return {};
}

test(
  "feature-flag admin UI proxies through /api/functions/config when Supabase public keys are absent",
  async () => {
    await withEnv(
      {
        SUPABASE_URL: undefined,
        SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        SUPABASE_FN_URL: SUPABASE_FUNCTION_HOST,
        SITE_URL: "https://admin.dynamic.capital",
      },
      async () => {
        const [{ POST }, { resetSupabaseFunctionCacheForTesting }] =
          await Promise.all([
            freshImport(
              new URL(
                "../apps/web/app/api/functions/[function]/route.ts",
                import.meta.url,
              ),
            ),
            freshImport(
              new URL(
                "../apps/web/app/api/_shared/supabase.ts",
                import.meta.url,
              ),
            ),
          ]);

        resetSupabaseFunctionCacheForTesting?.();

        const windowOrigin = "https://admin.dynamic.capital";
        const globalScope = globalThis as typeof globalThis & {
          window?: { location?: { origin?: string } };
        };
        const originalWindow = globalScope.window;
        globalScope.window = { location: { origin: windowOrigin } };

        const originalFetch = globalThis.fetch;
        const uiCalls: Array<{ url: string; action: unknown }> = [];
        const supabaseCalls: Array<{ url: string; action: unknown }> = [];
        const remoteState: Record<string, boolean> = { test_feature: true };

        try {
          globalThis.fetch = async (input, init) => {
            const url = typeof input === "string" ? input : input.url;
            if (url.startsWith(`${windowOrigin}/api/functions/config`)) {
              const body = init?.body ? await parseJsonBody(init.body) : {};
              uiCalls.push({ url, action: body.action });

              const request = new Request(url, {
                method: init?.method ?? "POST",
                headers: init?.headers,
                body: init?.body,
              });

              return await POST(request, {
                params: Promise.resolve({ function: "config" }),
              });
            }

            if (url.startsWith(`${SUPABASE_FUNCTION_HOST}/config`)) {
              const body = await parseJsonBody(init?.body);
              supabaseCalls.push({ url, action: body.action });

              switch (body.action) {
                case "getFlag": {
                  const name = String(body.name ?? "");
                  const fallback = Boolean(body.def);
                  const value = remoteState[name] ?? (fallback as boolean) ??
                    false;
                  return new Response(JSON.stringify({ data: value }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  });
                }
                case "setFlag": {
                  const name = String(body.name ?? "");
                  remoteState[name] = Boolean(body.value);
                  return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  });
                }
                case "preview": {
                  return new Response(
                    JSON.stringify({ ts: 123, data: { ...remoteState } }),
                    {
                      status: 200,
                      headers: { "Content-Type": "application/json" },
                    },
                  );
                }
                case "publish":
                case "rollback": {
                  return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  });
                }
                default:
                  return new Response(JSON.stringify({ error: "unknown" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                  });
              }
            }

            throw new Error(`Unexpected fetch invocation for ${url}`);
          };

          const configModule = await freshImport(
            new URL("../apps/web/utils/config.ts", import.meta.url),
          );

          const { getFlag, setFlag, preview, publish, rollback } = configModule;

          const initial = await getFlag("test_feature", false);
          equal(initial, true);

          await setFlag("test_feature", false);
          const snapshot = await preview();
          deepEqual(snapshot, { ts: 123, data: { test_feature: false } });

          await publish("admin-1");
          await rollback("admin-1");

          equal(uiCalls.length, 5);
          deepEqual(
            uiCalls.map((call) => call.url),
            new Array(5).fill(`${windowOrigin}/api/functions/config`),
          );
          deepEqual(
            uiCalls.map((call) => call.action),
            ["getFlag", "setFlag", "preview", "publish", "rollback"],
          );

          equal(supabaseCalls.length, 5);
          deepEqual(
            supabaseCalls.map((call) => call.url),
            new Array(5).fill(`${SUPABASE_FUNCTION_HOST}/config`),
          );
          deepEqual(
            supabaseCalls.map((call) => call.action),
            ["getFlag", "setFlag", "preview", "publish", "rollback"],
          );
        } finally {
          globalThis.fetch = originalFetch;
          if (originalWindow === undefined) {
            delete globalScope.window;
          } else {
            globalScope.window = originalWindow;
          }
        }
      },
    );
  },
);
