import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __testables,
  DCT_SYMBOL_CANONICALS,
  type DctMarketSnapshot,
  fetchDctMarketSnapshot,
} from "../dct-price";

const buildResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("fetchDctMarketSnapshot", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2024-07-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("aggregates liquidity-weighted prices across tracked pools", async () => {
    const payload = {
      pairs: [
        {
          pairAddress: "EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
          priceUsd: "1.20",
          priceChange: { h24: 12 },
          volume: { h24: 150000 },
          liquidity: { usd: 100000 },
          baseToken: { symbol: "DCT", name: "Dynamic Capital Token" },
        },
        {
          pairAddress: "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm",
          priceUsd: "1.80",
          priceChange: { h24: -6 },
          volume: { h24: 250000 },
          liquidity: { usd: 400000 },
          baseToken: { symbol: "DCT", name: "Dynamic Capital Token" },
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValue(buildResponse(payload));

    const snapshot = await fetchDctMarketSnapshot(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(snapshot).toMatchObject<DctMarketSnapshot>({
      price: expect.closeTo(1.68, 1e-6),
      changePercent: expect.closeTo(-2.4, 1e-6),
      change: expect.closeTo(-0.04032, 1e-6),
      previousClose: expect.closeTo(1.72032, 1e-6),
      volume24h: expect.closeTo(400000, 1e-6),
      sourceSymbol: "DCT",
      name: "Dynamic Capital Token",
      timestamp: "2024-07-01T12:00:00.000Z",
    });
  });

  it("throws when no tracked pools return usable price data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        buildResponse({ pairs: [{ pairAddress: "unknown", priceUsd: null }] }),
      );

    await expect(fetchDctMarketSnapshot(fetchMock)).rejects.toThrow(
      /missing tracked DCT pools/i,
    );
  });

  it("propagates non-OK responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse({}, 502));

    await expect(fetchDctMarketSnapshot(fetchMock)).rejects.toThrow(
      /Dex Screener request failed \(502\)/,
    );
  });
});

describe("DCT symbol canonical set", () => {
  it("contains canonical forms of known identifiers", () => {
    const { canonicalize } = __testables;
    expect(DCT_SYMBOL_CANONICALS.has("dct")).toBe(true);
    expect(DCT_SYMBOL_CANONICALS.has("dctton")).toBe(true);
    expect(
      DCT_SYMBOL_CANONICALS.has(
        canonicalize("EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y"),
      ),
    ).toBe(true);
  });
});
