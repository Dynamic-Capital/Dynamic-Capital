if (typeof Deno !== "undefined") {
  const { assertEquals, assertGreater, assertLess } = await import(
    "https://deno.land/std@0.224.0/assert/mod.ts"
  );
  const {
    assignStops,
    computeVolatility,
    deriveFibonacciAnchors,
  } = await import("../supabase/functions/_shared/sl_tp.ts");

  Deno.test("assignStops mirrors python helper for BUY with fibonacci levels", () => {
    const result = assignStops({
      entry: 100,
      side: "BUY",
      volatility: 10,
      rr: 2,
      fibonacciRetracement: 96,
      fibonacciExtension: 118,
      treasuryHealth: 1,
    });

    assertEquals(result.sl, 90.5);
    assertEquals(result.tp, 118.5);
  });

  Deno.test("assignStops widens SELL targets with strong treasury", () => {
    const result = assignStops({
      entry: 220,
      side: "SELL",
      volatility: 12,
      rr: 1.5,
      fibonacciRetracement: 228,
      fibonacciExtension: 190,
      treasuryHealth: 1.4,
    });

    assertEquals(result.sl, 234.3);
    assertEquals(result.tp, 194.28);
  });

  Deno.test("treasury stress tightens stops", () => {
    const baseline = assignStops({
      entry: 150,
      side: "BUY",
      volatility: 8,
    });
    const stressed = assignStops({
      entry: 150,
      side: "BUY",
      volatility: 8,
      treasuryHealth: 0.4,
    });

    if (baseline.sl === null || stressed.sl === null) {
      throw new Error("expected SL levels");
    }

    assertGreater(stressed.sl, baseline.sl);
  });

  Deno.test("computeVolatility averages recent deltas", () => {
    const prices = [100, 102, 101, 105, 104, 108];
    const vol = computeVolatility(prices, 3);
    assertLess(vol, 5);
    assertGreater(vol, 0);
  });

  Deno.test("deriveFibonacciAnchors returns retracement/extension pairs", () => {
    const prices = [100, 104, 99, 110, 108, 112];
    const buyAnchors = deriveFibonacciAnchors(prices, "BUY");
    const sellAnchors = deriveFibonacciAnchors(prices, "SELL");

    assertGreater(buyAnchors.extension, buyAnchors.retracement);
    assertGreater(sellAnchors.retracement, sellAnchors.extension);
  });
}
