import { assert, assertEquals } from "std/assert/mod.ts";

type FetchCall = {
  url: URL;
  method: string;
  headers: Headers;
};

function stubDenoServe() {
  const originalServe = Deno.serve;
  Deno.serve = ((..._args: unknown[]) => {
    return undefined as unknown as ReturnType<typeof originalServe>;
  }) as typeof Deno.serve;
  return () => {
    Deno.serve = originalServe;
  };
}

function setupEnv(serviceKey: string) {
  const g = globalThis as {
    process?: { env: Record<string, string | undefined> };
  };
  if (!g.process) {
    g.process = { env: {} };
  } else if (!g.process.env) {
    g.process.env = {};
  }

  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceKey);
  g.process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
}

function teardownEnv() {
  const g = globalThis as {
    process?: { env: Record<string, string | undefined> };
  };
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  if (g.process?.env) {
    delete g.process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
}

Deno.test("landing-hero-metrics aggregates supabase data", async () => {
  const serviceKey = "service-role-test";
  setupEnv(serviceKey);

  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  const restoreServe = stubDenoServe();

  let signalsCall = 0;

  globalThis.fetch = async (
    input: Request | URL | string,
    init?: RequestInit,
  ) => {
    await Promise.resolve(); // satisfy require-await

    const url = typeof input === "string"
      ? new URL(input)
      : input instanceof Request
      ? new URL(input.url)
      : new URL(input);
    const method = init?.method ??
      (input instanceof Request ? input.method : "GET");
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );

    calls.push({ url, method, headers });

    if (url.pathname.includes("/rest/v1/bot_users")) {
      return new Response(null, {
        status: 200,
        headers: {
          "content-range": "0-0/1234",
        },
      });
    }

    if (url.pathname.includes("/rest/v1/signals")) {
      signalsCall += 1;
      const count = signalsCall === 1 ? 87 : 240;
      return new Response(null, {
        status: 200,
        headers: {
          "content-range": `0-0/${count}`,
        },
      });
    }

    if (url.pathname.includes("/rest/v1/mentor_feedback")) {
      const rows = [
        { score: 4.6, submitted_at: "2025-09-15T00:00:00Z" },
        { score: 5.0, submitted_at: "2025-09-10T00:00:00Z" },
      ];
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": `0-${rows.length - 1}/${rows.length}`,
        },
      });
    }

    throw new Error(
      `Unhandled request: ${method} ${url.toString()}`,
    );
  };

  try {
    const { handler } = await import(
      `../landing-hero-metrics/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/landing-hero-metrics"),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as {
      generatedAt: string;
      tradersOnboarded: { total: number };
      liveSignals: { last30Days: number; last90Days: number };
      mentorSatisfaction: {
        average: number;
        fallback: boolean;
        sampleSize: number;
        windowDays: number;
      };
      algoPerformance: unknown;
      source: string;
    };

    assertEquals(payload.tradersOnboarded.total, 1234);
    assertEquals(payload.liveSignals.last30Days, 87);
    assertEquals(payload.liveSignals.last90Days, 240);
    assertEquals(payload.mentorSatisfaction.fallback, false);
    assertEquals(payload.mentorSatisfaction.sampleSize, 2);
    assertEquals(payload.mentorSatisfaction.windowDays, 90);
    assert(Math.abs(payload.mentorSatisfaction.average - 4.8) < 0.01);
    assertEquals(payload.algoPerformance, null);
    assertEquals(payload.source, "supabase");
    assert(typeof payload.generatedAt === "string");

    assertEquals(calls.length, 4);
    const [botUsersCall] = calls;
    assertEquals(botUsersCall.method, "HEAD");
    assert(botUsersCall.headers.get("authorization")?.startsWith("Bearer "));
  } finally {
    globalThis.fetch = originalFetch;
    restoreServe();
    teardownEnv();
  }
});

Deno.test("landing-hero-metrics returns fallbacks when tables are empty", async () => {
  const serviceKey = "service-role-test";
  setupEnv(serviceKey);

  const originalFetch = globalThis.fetch;
  const restoreServe = stubDenoServe();

  globalThis.fetch = async (
    input: Request | URL | string,
    init?: RequestInit,
  ) => {
    await Promise.resolve(); // satisfy require-await

    const url = typeof input === "string"
      ? new URL(input)
      : input instanceof Request
      ? new URL(input.url)
      : new URL(input);
    const method = init?.method ??
      (input instanceof Request ? input.method : "GET");

    if (url.pathname.includes("/rest/v1/mentor_feedback")) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": "0-0/0",
        },
      });
    }

    if (method === "HEAD" && url.pathname.includes("/rest/v1/")) {
      return new Response(null, {
        status: 200,
        headers: {
          "content-range": "0-0/0",
        },
      });
    }

    throw new Error(
      `Unhandled request: ${method} ${url.toString()}`,
    );
  };

  try {
    const { handler } = await import(
      `../landing-hero-metrics/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/landing-hero-metrics"),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as {
      tradersOnboarded: { total: number };
      liveSignals: { last30Days: number; last90Days: number };
      mentorSatisfaction: {
        average: number | null;
        fallback: boolean;
        sampleSize: number;
      };
      algoPerformance: unknown;
      source: string;
    };

    assertEquals(payload.tradersOnboarded.total, 0);
    assertEquals(payload.liveSignals.last30Days, 0);
    assertEquals(payload.liveSignals.last90Days, 0);
    assertEquals(payload.mentorSatisfaction.fallback, true);
    assertEquals(payload.mentorSatisfaction.sampleSize, 0);
    assertEquals(payload.mentorSatisfaction.average, null);
    assertEquals(payload.algoPerformance, null);
    assertEquals(payload.source, "supabase");
  } finally {
    globalThis.fetch = originalFetch;
    restoreServe();
    teardownEnv();
  }
});

Deno.test("landing-hero-metrics falls back to offline dataset without service key", async () => {
  teardownEnv();

  const originalFetch = globalThis.fetch;
  const restoreServe = stubDenoServe();

  globalThis.fetch = (() => {
    throw new Error("offline metrics should not perform network fetches");
  }) as typeof globalThis.fetch;

  try {
    const { handler } = await import(
      `../landing-hero-metrics/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/landing-hero-metrics"),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as {
      tradersOnboarded: { total: number };
      liveSignals: { last30Days: number; last90Days: number };
      mentorSatisfaction: {
        average: number | null;
        fallback: boolean;
        sampleSize: number;
      };
      algoPerformance: {
        fallback: boolean;
        datasetLabel: string;
        last30Days: {
          windowDays: number;
          totalTrades: number;
          wins: number;
          losses: number;
          breakeven: number;
          winRate: number | null;
          averageReturnPct: number | null;
          cumulativeReturnPct: number | null;
          profitFactor: number | null;
          averageHoldingHours: number | null;
          bestReturnPct: number | null;
          worstReturnPct: number | null;
        };
        last90Days: {
          windowDays: number;
          totalTrades: number;
          wins: number;
          losses: number;
          breakeven: number;
          winRate: number | null;
          averageReturnPct: number | null;
          cumulativeReturnPct: number | null;
          profitFactor: number | null;
          averageHoldingHours: number | null;
          bestReturnPct: number | null;
          worstReturnPct: number | null;
        };
      } | null;
      source: string;
    };

    assertEquals(payload.source, "offline-sample");
    assertEquals(payload.tradersOnboarded.total, 9600);
    assertEquals(payload.liveSignals.last30Days, 11);
    assertEquals(payload.liveSignals.last90Days, 16);
    assertEquals(payload.mentorSatisfaction.fallback, false);
    assertEquals(payload.mentorSatisfaction.sampleSize, 5);
    assertEquals(payload.mentorSatisfaction.average, 4.76);
    assert(payload.algoPerformance);

    const performance30 = payload.algoPerformance.last30Days;
    assertEquals(performance30.windowDays, 30);
    assertEquals(performance30.totalTrades, 11);
    assertEquals(performance30.wins, 7);
    assertEquals(performance30.losses, 3);
    assertEquals(performance30.breakeven, 1);
    assertEquals(performance30.winRate, 70);
    assertEquals(performance30.averageReturnPct, 0.81);
    assertEquals(performance30.cumulativeReturnPct, 8.9);
    assertEquals(performance30.profitFactor, 6.24);
    assertEquals(performance30.averageHoldingHours, 6.8);
    assertEquals(performance30.bestReturnPct, 2.4);
    assertEquals(performance30.worstReturnPct, -0.7);

    const performance90 = payload.algoPerformance.last90Days;
    assertEquals(performance90.windowDays, 90);
    assertEquals(performance90.totalTrades, 16);
    assertEquals(performance90.wins, 9);
    assertEquals(performance90.losses, 5);
    assertEquals(performance90.breakeven, 2);
    assertEquals(performance90.winRate, 64.3);
    assertEquals(performance90.averageReturnPct, 0.58);
    assertEquals(performance90.cumulativeReturnPct, 9.2);
    assertEquals(performance90.profitFactor, 3.49);
    assertEquals(performance90.averageHoldingHours, 6.6);
    assertEquals(performance90.bestReturnPct, 2.4);
    assertEquals(performance90.worstReturnPct, -1.1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreServe();
    teardownEnv();
  }
});
