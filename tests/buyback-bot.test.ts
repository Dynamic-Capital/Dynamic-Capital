import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";

import { BuybackBot, type BuybackBotConfig } from "../bots/buyback/index.ts";

const baseConfig: BuybackBotConfig = {
  venueAllowlist: ["binance", "kraken"],
  venueCaps: {
    binance: 100,
    kraken: 50,
  },
  rateLimitPerMinute: 10,
};

test("buyback bot caps orders per venue", async () => {
  const bot = new BuybackBot(baseConfig);
  const result = await bot.placeOrder({
    venue: "binance",
    asset: "USDT",
    amount: 250,
  });

  assertEquals(result.status, "filled");
  assertEquals(result.executedAmount, 100);
  assertEquals(result.requestedAmount, 250);
});

test("buyback bot rejects venues outside allowlist", async () => {
  const bot = new BuybackBot({
    ...baseConfig,
    venueAllowlist: ["kraken"],
  });

  const result = await bot.placeOrder({
    venue: "binance",
    asset: "USDT",
    amount: 10,
  });

  assertEquals(result.status, "rejected");
  assertEquals(result.reason, "VENUE_NOT_ALLOWLISTED");
  assertEquals(result.executedAmount, 0);
});

test("buyback bot enforces per-minute rate limits for Binance orders", async () => {
  const bot = new BuybackBot({
    ...baseConfig,
    rateLimitPerMinute: 1,
  });

  const firstResult = await bot.placeOrder({
    venue: "binance",
    asset: "USDT",
    amount: 50,
  });

  assertEquals(firstResult.status, "filled");
  assertEquals(firstResult.executedAmount, 50);

  const secondResult = await bot.placeOrder({
    venue: "binance",
    asset: "USDT",
    amount: 25,
  });

  assertEquals(secondResult.status, "rate_limited");
  assertEquals(secondResult.executedAmount, 0);
  assertEquals(secondResult.reason, "RATE_LIMIT_EXCEEDED");
});

test("buyback bot enforces rate limits per venue", async () => {
  const bot = new BuybackBot({
    ...baseConfig,
    rateLimitPerMinute: 1,
  });

  const binanceResult = await bot.placeOrder({
    venue: "binance",
    asset: "USDT",
    amount: 50,
  });

  const krakenResult = await bot.placeOrder({
    venue: "kraken",
    asset: "USDT",
    amount: 50,
  });

  assertEquals(binanceResult.status, "filled");
  assertEquals(krakenResult.status, "filled");
});

test("buyback bot resets rate limit window after sixty seconds", async () => {
  const bot = new BuybackBot({
    ...baseConfig,
    rateLimitPerMinute: 1,
  });

  const originalNow = Date.now;
  let fakeNow = 0;
  Date.now = () => fakeNow;

  try {
    const firstResult = await bot.placeOrder({
      venue: "binance",
      asset: "USDT",
      amount: 50,
    });

    fakeNow = 30_000;
    const secondResult = await bot.placeOrder({
      venue: "binance",
      asset: "USDT",
      amount: 20,
    });

    fakeNow = 61_000;
    const thirdResult = await bot.placeOrder({
      venue: "binance",
      asset: "USDT",
      amount: 25,
    });

    assertEquals(firstResult.status, "filled");
    assertEquals(secondResult.status, "rate_limited");
    assertEquals(thirdResult.status, "filled");
  } finally {
    Date.now = originalNow;
  }
});

test("buyback bot rejects invalid order amounts", async () => {
  const bot = new BuybackBot(baseConfig);

  const zeroResult = await bot.placeOrder({
    venue: "binance",
    asset: "USDT",
    amount: 0,
  });

  const negativeResult = await bot.placeOrder({
    venue: "binance",
    asset: "USDT",
    amount: -5,
  });

  assertEquals(zeroResult.status, "rejected");
  assertEquals(zeroResult.reason, "INVALID_AMOUNT");
  assertEquals(negativeResult.status, "rejected");
  assertEquals(negativeResult.reason, "INVALID_AMOUNT");
});
