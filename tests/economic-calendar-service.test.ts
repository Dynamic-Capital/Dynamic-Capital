import test from "node:test";
import {
  deepStrictEqual,
  ok,
  strictEqual,
} from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { freshImport } from "./utils/freshImport.ts";

test("economic calendar service normalizes REST payloads", async () => {
  const prevUrl = process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL;
  const prevKey = process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY;
  process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL =
    "https://api.example.com/calendar";
  process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY = "test-key";

  const originalFetch = globalThis.fetch;
  let capturedUrl: string | URL | Request | undefined;
  let capturedHeaders: Record<string, string> | undefined;

  globalThis.fetch = async (input, init) => {
    capturedUrl = input as string | URL | Request;
    capturedHeaders = init?.headers as Record<string, string> | undefined;
    const body = JSON.stringify({
      events: [
        {
          id: "fomc",
          scheduled_at: "2024-03-19T18:00:00Z",
          title: "FOMC rate decision & Powell press conference",
          impact: "high",
          market_focus: ["USD", "Rates", "US Indices"],
          commentary: "Test commentary",
          desk_plan: ["Step one", "Step two"],
        },
      ],
    });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const service = await freshImport(
      "../../apps/web/services/economic-calendar.ts",
    );
    const events = await service.fetchEconomicEvents({ force: true, source: "rest" });

    strictEqual(
      typeof capturedUrl === "string" ? capturedUrl : capturedUrl?.toString(),
      "https://api.example.com/calendar",
    );

    ok(capturedHeaders);
    strictEqual(capturedHeaders?.["x-api-key"], "test-key");
    strictEqual(events.length, 1);

    const [event] = events;
    strictEqual(event.id, "fomc");
    strictEqual(event.day, "Tue · 19 Mar");
    strictEqual(event.time, "18:00 GMT");
    strictEqual(event.impact, "High");
    deepStrictEqual(event.marketFocus, ["USD", "Rates", "US Indices"]);
    deepStrictEqual(event.deskPlan, ["Step one", "Step two"]);
    strictEqual(event.commentary, "Test commentary");

    service.resetEconomicCalendarCache();
  } finally {
    globalThis.fetch = originalFetch;
    if (prevUrl === undefined) {
      delete process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL;
    } else {
      process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL = prevUrl;
    }
    if (prevKey === undefined) {
      delete process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY;
    } else {
      process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_API_KEY = prevKey;
    }
  }
});

test("economic calendar service falls back to desk plan snapshots", async () => {
  const prevUrl = process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL;
  process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL =
    "https://api.example.com/calendar";

  const planPath = new URL(
    "../apps/web/data/trading-desk-plan.json",
    import.meta.url,
  );
  const planData = JSON.parse(await readFile(planPath, "utf-8")) as Record<
    string,
    { plan: string[] }
  >;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const body = JSON.stringify({
      events: [
        {
          id: "fomc",
          scheduled_at: "2024-03-19T18:00:00Z",
          title: "FOMC rate decision",
          impact: "medium",
          market_focus: ["USD"],
          commentary: "Uses fallback plan",
        },
      ],
    });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const service = await freshImport(
      "../../apps/web/services/economic-calendar.ts",
    );
    const events = await service.fetchEconomicEvents({ force: true, source: "rest" });

    strictEqual(events.length, 1);
    const [event] = events;
    ok(event.deskPlan.length > 0);
    deepStrictEqual(event.deskPlan, planData["fomc"].plan);
    strictEqual(event.impact, "Medium");

    service.resetEconomicCalendarCache();
  } finally {
    globalThis.fetch = originalFetch;
    if (prevUrl === undefined) {
      delete process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL;
    } else {
      process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL = prevUrl;
    }
  }
});
