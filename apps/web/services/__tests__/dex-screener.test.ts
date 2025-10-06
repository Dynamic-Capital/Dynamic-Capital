import { afterEach, describe, expect, it } from "vitest";

import {
  __setDexScreenerFetchOverride,
  buildDexScreenerResource,
  DEX_SCREENER_API_BASE_URL,
  DEX_SCREENER_API_ENDPOINTS,
  fetchDexScreenerSnapshot,
} from "../dex-screener";

const { latestProfiles, latestBoosts, topBoosts } = DEX_SCREENER_API_ENDPOINTS;
const PROFILES_URL = `${DEX_SCREENER_API_BASE_URL}${latestProfiles}`;
const LATEST_BOOSTS_URL = `${DEX_SCREENER_API_BASE_URL}${latestBoosts}`;
const TOP_BOOSTS_URL = `${DEX_SCREENER_API_BASE_URL}${topBoosts}`;

function responseFrom(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return (input as Request).url;
}

describe("dex-screener service", () => {
  afterEach(() => {
    __setDexScreenerFetchOverride(undefined);
  });

  it("normalises snapshot payloads", async () => {
    __setDexScreenerFetchOverride(async (input) => {
      const url = toUrl(input);
      if (url === PROFILES_URL) {
        return responseFrom([
          {
            url: "https://dexscreener.com/ton/sample",
            chainId: "ton",
            tokenAddress: "EQA111",
            description: "Test profile",
            icon: "https://cdn.example.com/icon.png",
            header: "https://cdn.example.com/header.png",
            openGraph: "https://cdn.example.com/og.png",
            links: [
              {
                type: "website",
                label: "Docs",
                url: "https://dynamic.capital",
              },
              { url: "https://dynamic.capital" },
            ],
          },
          {
            url: "not-a-url",
            chainId: "ton",
            tokenAddress: "EQA222",
          },
        ]);
      }
      if (url === LATEST_BOOSTS_URL) {
        return responseFrom([
          {
            url: "https://dexscreener.com/ton/sample-boost",
            chainId: "ton",
            tokenAddress: "EQA111",
            amount: "40",
            totalAmount: 200,
            links: [
              { type: "twitter", url: "https://x.com/dynamiccapital" },
            ],
          },
        ]);
      }
      if (url === TOP_BOOSTS_URL) {
        return responseFrom([
          {
            url: "https://dexscreener.com/ton/top",
            chainId: "ton",
            tokenAddress: "EQA333",
            totalAmount: "500",
          },
        ]);
      }
      throw new Error(`Unexpected fetch ${url}`);
    });

    const snapshot = await fetchDexScreenerSnapshot();
    expect(snapshot.status).toBe("ok");
    expect(snapshot.profiles).toHaveLength(1);
    expect(snapshot.latestBoosts[0]?.amount).toBe(40);
    expect(snapshot.topBoosts[0]?.totalAmount).toBe(500);
    expect(snapshot.errors).toHaveLength(0);
  });

  it("reports partial failures", async () => {
    __setDexScreenerFetchOverride(async (input) => {
      const url = toUrl(input);
      if (url === PROFILES_URL) {
        return responseFrom([
          {
            url: "https://dexscreener.com/ton/sample",
            chainId: "ton",
            tokenAddress: "EQA111",
          },
        ]);
      }
      if (url === LATEST_BOOSTS_URL) {
        return new Response("error", { status: 503 });
      }
      if (url === TOP_BOOSTS_URL) {
        return Promise.reject(new Error("network unreachable"));
      }
      throw new Error(`Unexpected fetch ${url}`);
    });

    const snapshot = await fetchDexScreenerSnapshot();
    expect(snapshot.status).toBe("partial");
    expect(snapshot.profiles).toHaveLength(1);
    expect(snapshot.latestBoosts).toHaveLength(0);
    expect(snapshot.topBoosts).toHaveLength(0);
    expect(snapshot.errors.length).toBe(2);

    const resource = await buildDexScreenerResource();
    expect(resource.status).toBe("partial");
    expect(resource.errors?.length).toBe(2);
  });
});
