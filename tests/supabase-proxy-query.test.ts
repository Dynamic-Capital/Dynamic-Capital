import test from "node:test";
import { equal } from "node:assert/strict";

import { freshImport } from "./utils/freshImport.ts";
import { withEnv } from "./utils/withEnv.ts";

const SUPABASE_FUNCTION_HOST =
  "https://oqvbsowkxkmughsclwzd.functions.supabase.co";

const WORKSPACE_ORIGIN = "https://app.dynamic.capital";

test(
  "supabase proxy preserves search parameters when forwarding edge function requests",
  async () => {
    await withEnv(
      {
        SUPABASE_URL: undefined,
        SUPABASE_ANON_KEY: undefined,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        SUPABASE_FN_URL: SUPABASE_FUNCTION_HOST,
        SITE_URL: WORKSPACE_ORIGIN,
      },
      async () => {
        const [{ GET }, { resetSupabaseFunctionCacheForTesting }] =
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

        const globalScope = globalThis as typeof globalThis & {
          window?: { location?: { origin?: string } };
        };
        const originalWindow = globalScope.window;
        globalScope.window = { location: { origin: WORKSPACE_ORIGIN } };

        const originalFetch = globalThis.fetch;
        const supabaseCalls: string[] = [];

        try {
          globalThis.fetch = async (input, init) => {
            const url = typeof input === "string" ? input : input.url;

            if (url.startsWith(`${SUPABASE_FUNCTION_HOST}/market-equity-quotes`)) {
              supabaseCalls.push(url);
              return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            throw new Error(`Unexpected fetch invocation for ${url}`);
          };

          const request = new Request(
            `${WORKSPACE_ORIGIN}/api/functions/market-equity-quotes?symbols=AAPL%2CTSLA`,
            {
              method: "GET",
              headers: { Accept: "application/json" },
            },
          );

          const response = await GET(request, {
            params: Promise.resolve({ function: "market-equity-quotes" }),
          });

          equal(response.status, 200);
          const payload = (await response.json()) as { ok?: boolean };
          equal(payload.ok, true);

          equal(supabaseCalls.length, 1);
          equal(
            supabaseCalls[0],
            `${SUPABASE_FUNCTION_HOST}/market-equity-quotes?symbols=AAPL%2CTSLA`,
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
