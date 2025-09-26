function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} but received ${actual}`);
  }
}

function assertThrows(fn: () => unknown): void {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }

  if (!thrown) {
    throw new Error("Expected function to throw");
  }
}

import {
  assertProfileAccess,
  normalizeEquityRow,
  normalizeNumeric,
} from "./investor-metrics.ts";

declare const Deno: {
  test: (name: string, fn: () => void | Promise<void>) => void;
};

Deno.test("normalizeNumeric parses numeric strings and guards NaN", () => {
  assertEquals(normalizeNumeric("120.42"), 120.42);
  assertEquals(normalizeNumeric(" 0.0001"), 0.0001);
  assertEquals(normalizeNumeric("not-a-number"), 0);
  assertEquals(normalizeNumeric(null), 0);
});

Deno.test("normalizeEquityRow converts raw equity payloads", () => {
  const result = normalizeEquityRow({
    contribution_usdt: "1500.50",
    marked_equity_usdt: 1725.75,
    profit_loss_usdt: "225.25",
    last_valuation_at: "2025-01-15T00:00:00Z",
  });

  assertEquals(result.contributionUsd, 1500.5);
  assertEquals(result.markedEquityUsd, 1725.75);
  assertEquals(result.profitLossUsd, 225.25);
  assertEquals(result.lastValuationAt, "2025-01-15T00:00:00Z");
});

Deno.test("assertProfileAccess rejects missing identifiers", () => {
  assertThrows(() => assertProfileAccess(undefined));
  assertThrows(() => assertProfileAccess(""));
  assertThrows(() => assertProfileAccess("   "));
});

Deno.test("assertProfileAccess accepts valid identifiers", () => {
  assertEquals(assertProfileAccess("user-123"), undefined);
});
