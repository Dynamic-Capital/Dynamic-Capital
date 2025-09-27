import test from "node:test";
import assert from "node:assert/strict";

import { freshImport } from "./utils/freshImport.ts";
import {
  __resetSupabaseState,
  __testSupabaseState,
} from "./supabase-client-stub.ts";

function patchSource(src: string): string {
  return src
    .replace("../_shared/client.ts", "../../../tests/supabase-client-stub.ts")
    .replace("../_shared/serve.ts", "../../../tests/serve-stub.ts");
}

test("dynamic hedge opens and closes hedges based on telemetry", async () => {
  __resetSupabaseState();
  const orig = new URL(
    "../supabase/functions/dynamic-hedge/index.ts",
    import.meta.url,
  );
  const patched = new URL(
    "../supabase/functions/dynamic-hedge/index.test.ts",
    import.meta.url,
  );
  let handler: (req: Request) => Promise<Response>;

  try {
    const src = await Deno.readTextFile(orig);
    await Deno.writeTextFile(patched, patchSource(src));
    ({ default: handler } = await freshImport(patched));

    const initialRequest = new Request("http://localhost/dynamic-hedge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "netting",
        exposures: [
          { symbol: "XAUUSD", direction: "LONG", quantity: 2.0, beta: 1.1 },
        ],
        volatility: [
          { symbol: "XAUUSD", atr: 24, price: 1905, medianRatio: 0.01 },
        ],
        correlations: { XAUUSD: { DXY: -0.75 } },
        drawdown: { openR: 2.5, riskCapital: 400 },
        news: [
          { symbol: "XAUUSD", minutesUntil: 45, severity: "high" },
        ],
      }),
    });

    const openResponse = await handler(initialRequest);
    assert.equal(openResponse.status, 200);
    const openBody = await openResponse.json();
    assert.equal(openBody.summary.requestedOpens, 1);
    assert.equal(__testSupabaseState.hedgeActions.size, 1);
    assert.equal(__testSupabaseState.signals.size >= 1, true);

    const hedgeId = Array.from(__testSupabaseState.hedgeActions.keys())[0]!;

    const calmRequest = new Request("http://localhost/dynamic-hedge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        exposures: [],
        volatility: [
          { symbol: "XAUUSD", atr: 12, price: 1910, medianRatio: 0.01 },
        ],
        drawdown: { openR: 0.4 },
      }),
    });

    const closeResponse = await handler(calmRequest);
    assert.equal(closeResponse.status, 200);
    const closeBody = await closeResponse.json();
    assert.equal(closeBody.summary.requestedCloses, 1);

    const closedRecord = __testSupabaseState.hedgeActions.get(hedgeId);
    assert.ok(closedRecord);
    assert.equal(closedRecord?.status, "CLOSED");
  } finally {
    await Deno.remove(patched).catch(() => {});
  }
});
