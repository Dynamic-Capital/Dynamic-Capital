import test from "node:test";
import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert/strict";
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

  let awesomeApiUrl: string | undefined;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (url === "https://api.example.com/calendar") {
      capturedUrl = input as string | URL | Request;
      capturedHeaders = init?.headers as Record<string, string> | undefined;
      const body = JSON.stringify({
        events: [
          {
            id: "fomc",
            scheduled_at: "2024-03-19T18:00:00Z",
            title: "FOMC rate decision & Powell press conference",
            impact: "high",
            market_focus: ["EURUSD", "USDJPY"],
            commentary: "Test commentary",
            desk_plan: ["Step one", "Step two"],
          },
        ],
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.startsWith("https://economia.awesomeapi.com.br/last/")) {
      awesomeApiUrl = url;
      const body = JSON.stringify({
        EURUSD: {
          bid: "1.1000",
          pctChange: "0.50",
          high: "1.1050",
          low: "1.0950",
          create_date: "2024-03-19 17:59:00",
        },
        USDJPY: {
          bid: "151.200",
          pctChange: "-0.30",
          high: "152.000",
          low: "150.900",
          create_date: "2024-03-19 17:59:00",
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const service = await freshImport(
      "../../apps/web/services/economic-calendar.ts",
    );
    const events = await service.fetchEconomicEvents({
      force: true,
      source: "rest",
    });

    strictEqual(
      typeof capturedUrl === "string" ? capturedUrl : capturedUrl?.toString(),
      "https://api.example.com/calendar",
    );

    ok(capturedHeaders);
    strictEqual(capturedHeaders?.["x-api-key"], "test-key");
    ok(awesomeApiUrl);
    ok(awesomeApiUrl?.includes("EUR-USD"));
    ok(awesomeApiUrl?.includes("USD-JPY"));
    strictEqual(events.length, 1);

    const [event] = events;
    strictEqual(event.id, "fomc");
    strictEqual(event.day, "Tue · 19 Mar");
    strictEqual(event.time, "18:00 GMT");
    strictEqual(event.impact, "High");
    deepStrictEqual(event.marketFocus, ["EURUSD", "USDJPY"]);
    strictEqual(event.marketHighlights.length, 2);
    const [eurusdHighlight, usdjpyHighlight] = event.marketHighlights;
    strictEqual(eurusdHighlight.focus, "EURUSD");
    strictEqual(eurusdHighlight.instruments.length, 1);
    strictEqual(eurusdHighlight.instruments[0].instrumentId, "EURUSD");
    strictEqual(eurusdHighlight.instruments[0].displaySymbol, "EUR/USD");
    strictEqual(eurusdHighlight.instruments[0].last, 1.1);
    strictEqual(eurusdHighlight.instruments[0].changePercent, 0.5);
    strictEqual(usdjpyHighlight.focus, "USDJPY");
    strictEqual(usdjpyHighlight.instruments.length, 1);
    strictEqual(usdjpyHighlight.instruments[0].instrumentId, "USDJPY");
    strictEqual(usdjpyHighlight.instruments[0].displaySymbol, "USD/JPY");
    strictEqual(usdjpyHighlight.instruments[0].last, 151.2);
    strictEqual(usdjpyHighlight.instruments[0].changePercent, -0.3);
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

test("economic calendar service supports open source calendar payload", async () => {
  const prevUrl = process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL;
  process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL =
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

  const originalFetch = globalThis.fetch;
  const awesomeRequests: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (url === "https://nfs.faireconomy.media/ff_calendar_thisweek.json") {
      const body = JSON.stringify([
        {
          title: "FOMC Statement",
          date: "2024-03-20T14:00:00-04:00",
          impact: "High",
          forecast: "5.50%",
          previous: "5.50%",
          country: "USD",
        },
        {
          title: "UK CPI y/y",
          date: "2024-03-20T07:00:00+00:00",
          impact: "Medium",
          forecast: "3.1%",
          previous: "3.2%",
          country: "GBP",
        },
      ]);
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.startsWith("https://economia.awesomeapi.com.br/last/")) {
      awesomeRequests.push(url);
      const body = JSON.stringify({
        EURUSD: {
          bid: "1.0800",
          pctChange: "0.20",
          high: "1.0850",
          low: "1.0700",
          create_date: "2024-03-20 17:00:00",
        },
        USDJPY: {
          bid: "151.000",
          pctChange: "-0.10",
          high: "151.500",
          low: "150.500",
          create_date: "2024-03-20 17:00:00",
        },
        GBPUSD: {
          bid: "1.2600",
          pctChange: "0.15",
          high: "1.2650",
          low: "1.2500",
          create_date: "2024-03-20 07:05:00",
        },
        USDCAD: {
          bid: "1.3500",
          pctChange: "0.05",
          high: "1.3550",
          low: "1.3400",
          create_date: "2024-03-20 17:00:00",
        },
        USDSEK: {
          bid: "10.5000",
          pctChange: "0.30",
          high: "10.6000",
          low: "10.4000",
          create_date: "2024-03-20 17:00:00",
        },
        USDCHF: {
          bid: "0.9000",
          pctChange: "-0.05",
          high: "0.9050",
          low: "0.8950",
          create_date: "2024-03-20 17:00:00",
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const service = await freshImport(
      "../../apps/web/services/economic-calendar.ts",
    );
    const events = await service.fetchEconomicEvents({
      force: true,
      source: "rest",
    });

    strictEqual(events.length, 2);
    strictEqual(awesomeRequests.length, 1);

    const [ukCpi, fomc] = events;
    ok(ukCpi.id.length > 0);
    strictEqual(ukCpi.impact, "Medium");
    strictEqual(ukCpi.time, "07:00 GMT");
    ok(ukCpi.commentary.includes("Forecast: 3.1%"));
    ok(ukCpi.commentary.includes("Previous: 3.2%"));
    deepStrictEqual(ukCpi.marketFocus, ["GBP"]);
    ok(ukCpi.deskPlan.length > 0);

    strictEqual(fomc.impact, "High");
    strictEqual(fomc.time, "18:00 GMT");
    ok(fomc.commentary.includes("Forecast: 5.50%"));
    deepStrictEqual(fomc.marketFocus, ["USD"]);
    ok(fomc.deskPlan.length > 0);

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
  globalThis.fetch = async (input) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (url === "https://api.example.com/calendar") {
      const body = JSON.stringify({
        events: [
          {
            id: "fomc",
            scheduled_at: "2024-03-19T18:00:00Z",
            title: "FOMC rate decision",
            impact: "medium",
            market_focus: ["USDJPY"],
            commentary: "Uses fallback plan",
          },
        ],
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.startsWith("https://economia.awesomeapi.com.br/last/")) {
      const body = JSON.stringify({
        USDJPY: {
          bid: "150.500",
          pctChange: "0.10",
          high: "150.900",
          low: "149.900",
          create_date: "2024-03-19 17:58:00",
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const service = await freshImport(
      "../../apps/web/services/economic-calendar.ts",
    );
    const events = await service.fetchEconomicEvents({
      force: true,
      source: "rest",
    });

    strictEqual(events.length, 1);
    const [event] = events;
    ok(event.deskPlan.length > 0);
    deepStrictEqual(event.deskPlan, planData["fomc"].plan);
    strictEqual(event.impact, "Medium");
    strictEqual(event.marketHighlights.length, 1);
    strictEqual(event.marketHighlights[0]?.focus, "USDJPY");

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

test("economic calendar service retries after a failed request", async () => {
  const prevUrl = process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL;
  process.env.NEXT_PUBLIC_ECONOMIC_CALENDAR_URL =
    "https://api.example.com/calendar";

  const originalFetch = globalThis.fetch;
  let restRequestCount = 0;
  let awesomeRequestCount = 0;

  globalThis.fetch = async (input, _init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

    if (url === "https://api.example.com/calendar") {
      restRequestCount += 1;
      if (restRequestCount === 1) {
        return new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        });
      }

      const body = JSON.stringify({
        events: [
          {
            id: "cpi",
            scheduled_at: "2024-03-20T12:30:00Z",
            title: "Consumer Price Index",
            impact: "low",
            market_focus: ["EURUSD"],
            commentary: "CPI release",
          },
        ],
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.startsWith("https://economia.awesomeapi.com.br/last/")) {
      awesomeRequestCount += 1;
      const body = JSON.stringify({
        EURUSD: {
          bid: "1.0800",
          pctChange: "0.20",
          high: "1.0820",
          low: "1.0750",
          create_date: "2024-03-20 12:25:00",
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const service = await freshImport(
      "../../apps/web/services/economic-calendar.ts",
    );

    await rejects(service.fetchEconomicEvents({ source: "rest" }));
    strictEqual(restRequestCount, 1);

    const events = await service.fetchEconomicEvents({ source: "rest" });

    strictEqual(restRequestCount, 2);
    strictEqual(awesomeRequestCount, 1);
    strictEqual(events.length, 1);
    const [event] = events;
    strictEqual(event.id, "cpi");
    strictEqual(event.time, "12:30 GMT");
    deepStrictEqual(event.marketFocus, ["EURUSD"]);
    strictEqual(service.getCachedEconomicEvents().length, 1);
    strictEqual(service.getCachedEconomicEventsError(), null);

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
