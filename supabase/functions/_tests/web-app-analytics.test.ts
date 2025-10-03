(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type {
  PostgrestError,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2?dts";
import { incrementDailyAnalytics } from "../web-app-analytics/index.ts";

type StoredButtonClicks = Record<string, number | string>;

type UpsertCall = {
  payload: { date: string; button_clicks: Record<string, number> };
  options: Record<string, unknown> | undefined;
};

interface MockConfig {
  rows?: Record<string, StoredButtonClicks>;
  selectResponses?: Array<{
    data: { button_clicks: StoredButtonClicks } | null;
    error: PostgrestError | null;
  }>;
  upsertError?: PostgrestError | null;
}

function createMockSupabase(config: MockConfig = {}) {
  const rows = new Map(Object.entries(config.rows ?? {}));
  const selectQueue = config.selectResponses
    ? [...config.selectResponses]
    : null;
  const upsertCalls: UpsertCall[] = [];

  const client = {
    from(table: string) {
      if (table !== "daily_analytics") {
        throw new Error(`Unexpected table ${table}`);
      }
      const query: { date?: string } = {};
      return {
        select(_fields: string) {
          return this;
        },
        eq(_field: string, value: string) {
          query.date = value;
          return this;
        },
        async maybeSingle() {
          if (selectQueue && selectQueue.length > 0) {
            const next = selectQueue.shift()!;
            return next;
          }
          if (!query.date) {
            return { data: null, error: null };
          }
          const existing = rows.get(query.date);
          if (!existing) {
            return { data: null, error: null };
          }
          return {
            data: { button_clicks: existing },
            error: null,
          };
        },
        async upsert(
          payload: { date: string; button_clicks: Record<string, number> },
          options?: Record<string, unknown>,
        ) {
          upsertCalls.push({ payload, options });
          if (config.upsertError) {
            return { data: null, error: config.upsertError };
          }
          rows.set(payload.date, payload.button_clicks);
          return { data: null, error: null };
        },
      };
    },
  } satisfies Record<string, unknown>;

  return {
    client: client as unknown as SupabaseClient,
    getRow(date: string) {
      return rows.get(date) ?? null;
    },
    getUpsertCalls() {
      return upsertCalls;
    },
  };
}

Deno.test("incrementDailyAnalytics inserts a new counter when row missing", async () => {
  const mock = createMockSupabase();
  const error = await incrementDailyAnalytics(
    mock.client,
    "2024-05-01",
    "cta_click",
  );

  assertEquals(error, null);
  assertEquals(mock.getRow("2024-05-01"), { cta_click: 1 });
  assertEquals(mock.getUpsertCalls()[0]?.options, {
    onConflict: "date",
    ignoreDuplicates: false,
  });
});

Deno.test("incrementDailyAnalytics increments existing counts and preserves others", async () => {
  const mock = createMockSupabase({
    rows: {
      "2024-05-02": { cta_click: 2, banner_open: "3" },
    },
  });

  const error = await incrementDailyAnalytics(
    mock.client,
    "2024-05-02",
    "cta_click",
  );

  assertEquals(error, null);
  assertEquals(mock.getRow("2024-05-02"), {
    cta_click: 3,
    banner_open: 3,
  });
});

Deno.test("incrementDailyAnalytics surfaces upsert errors", async () => {
  const mockError: PostgrestError = {
    code: "23505",
    details: "duplicate",
    hint: null,
    message: "unique violation",
  };
  const mock = createMockSupabase({ upsertError: mockError });
  const error = await incrementDailyAnalytics(
    mock.client,
    "2024-05-03",
    "cta_click",
  );

  assertEquals(error, mockError);
  assertEquals(mock.getRow("2024-05-03"), null);
});

Deno.test("incrementDailyAnalytics ignores missing-row errors", async () => {
  const mock = createMockSupabase({
    selectResponses: [{
      data: null,
      error: { code: "PGRST116", details: null, hint: null, message: "No row" },
    }],
  });

  const error = await incrementDailyAnalytics(
    mock.client,
    "2024-05-04",
    "cta_click",
  );

  assertEquals(error, null);
  assertEquals(mock.getRow("2024-05-04"), { cta_click: 1 });
});

Deno.test("incrementDailyAnalytics returns other select errors", async () => {
  const mockError: PostgrestError = {
    code: "PGRST123",
    details: "boom",
    hint: null,
    message: "select error",
  };
  const mock = createMockSupabase({
    selectResponses: [{ data: null, error: mockError }],
  });

  const error = await incrementDailyAnalytics(
    mock.client,
    "2024-05-05",
    "cta_click",
  );

  assertEquals(error, mockError);
});
