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
