import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { JSDOM } from "https://esm.sh/jsdom@22.1.0";
import React from "https://esm.sh/react@18.2.0";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "https://esm.sh/@testing-library/react@14.2.1";

import FundTransparencyTab from "./page.tsx";

let domInitialized = false;

function setupDom() {
  if (domInitialized) return;
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  const { window } = dom;

  globalThis.window = window as unknown as typeof globalThis.window;
  globalThis.document = window.document;
  globalThis.navigator = window.navigator;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.SVGElement = window.SVGElement;
  globalThis.getComputedStyle = window.getComputedStyle;

  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });
  }

  if (typeof window.ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
  }

  if (typeof globalThis.requestAnimationFrame === "undefined") {
    globalThis.requestAnimationFrame = (
      callback: FrameRequestCallback,
    ): number => (
      setTimeout(() => callback(Date.now()), 16) as unknown as number
    );
    globalThis.cancelAnimationFrame = (handle: number) =>
      clearTimeout(handle as unknown as number);
  }

  domInitialized = true;
}

deno.test("renders live fund metrics when API succeeds", async () => {
  setupDom();
  const originalFetch = globalThis.fetch;
  const metrics = {
    supplyAllocation: [
      { name: "Circulating", value: 6_200_000 },
      { name: "Treasury", value: 2_800_000 },
      { name: "Burned", value: 1_000_000 },
    ],
    roiHistory: [
      { epoch: "E1", roi: 4.2 },
      { epoch: "E2", roi: 4.8 },
    ],
    totals: {
      circulatingSupply: 6_200_000,
      treasuryHoldings: 2_800_000,
      totalBurned: 1_000_000,
      activeInvestors: 18450,
      activeWallets: 20000,
      currentEpochRewards: 82500,
      operationsTon: 1200,
      autoInvestTon: 800,
      burnTon: 200,
      tonPaid: 2200,
    },
    changes: {
      circulatingPct: 2.4,
      burnSharePct: 16.1,
      investorParticipationPct: 92.2,
      rewardsRoi: 5.12,
    },
  };

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ ok: true, data: metrics }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  try {
    render(React.createElement(FundTransparencyTab));

    const supplyValue = await screen.findByText("6.2M DCT");
    assertEquals(supplyValue.textContent, "6.2M DCT");

    await waitFor(() => {
      const rewardText = screen.getByText("Avg ROI 5.12%");
      assertEquals(rewardText.textContent, "Avg ROI 5.12%");
    });

    const investors = await screen.findByText("18,450 wallets");
    assertStringIncludes(investors.textContent ?? "", "18,450 wallets");
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
  }
});

deno.test("shows an error state when the API fails", async () => {
  setupDom();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response("Server error", { status: 500 });

  try {
    render(React.createElement(FundTransparencyTab));
    const errorText = await screen.findByText("Unable to load fund metrics");
    assertEquals(errorText.textContent, "Unable to load fund metrics");
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
  }
});
