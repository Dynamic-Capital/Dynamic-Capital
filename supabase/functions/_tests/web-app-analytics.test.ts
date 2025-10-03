(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assertEquals } from "std/assert/mod.ts";
import type { SupabaseClient } from "../_shared/client.ts";
import { incrementDailyButtonClicks } from "../web-app-analytics/index.ts";

type StoredClicks = Record<string, number | string>;

function createDailyAnalyticsMock(
  initial: Record<string, StoredClicks> = {},
) {
  const rows = new Map<string, StoredClicks>(
    Object.entries(initial).map(([date, clicks]) => [date, { ...clicks }]),
  );

  const supabase = {
    from(table: string) {
      if (table !== "daily_analytics") {
        throw new Error(`Unexpected table: ${table}`);
      }

      let selectedDate: string | null = null;

      return {
        select() {
          return this;
        },
        eq(_column: string, value: string) {
          selectedDate = value;
          return this;
        },
        async maybeSingle() {
          if (!selectedDate) {
            throw new Error("Date filter must be applied before maybeSingle");
          }

          const entry = rows.get(selectedDate);
          return {
            data: entry
              ? { date: selectedDate, button_clicks: { ...entry } }
              : null,
            error: null,
          };
        },
        async upsert(
          row: { date: string; button_clicks: Record<string, number> },
        ) {
          rows.set(row.date, { ...row.button_clicks });
          return { data: null, error: null };
        },
      };
    },
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    getClicks(date: string): Record<string, number> | undefined {
      const entry = rows.get(date);
      if (!entry) return undefined;
      return Object.entries(entry).reduce<Record<string, number>>(
        (acc, [k, v]) => {
          const numericValue = typeof v === "number" ? v : Number(v ?? 0);
          acc[k] = Number.isFinite(numericValue) ? numericValue : 0;
          return acc;
        },
        {},
      );
    },
  };
}

Deno.test("incrementDailyButtonClicks creates a new record when missing", async () => {
  const mock = createDailyAnalyticsMock();
  const date = "2024-10-03";

  const updated = await incrementDailyButtonClicks(
    mock.supabase,
    date,
    "cta_click",
  );

  assertEquals(updated, { cta_click: 1 });
  assertEquals(mock.getClicks(date), { cta_click: 1 });
});

Deno.test("incrementDailyButtonClicks normalizes existing counters", async () => {
  const mock = createDailyAnalyticsMock({
    "2024-10-02": { cta_click: "2", hero_view: 5 },
  });

  const updated = await incrementDailyButtonClicks(
    mock.supabase,
    "2024-10-02",
    "cta_click",
  );

  assertEquals(updated, { cta_click: 3, hero_view: 5 });
  assertEquals(mock.getClicks("2024-10-02"), { cta_click: 3, hero_view: 5 });
});
