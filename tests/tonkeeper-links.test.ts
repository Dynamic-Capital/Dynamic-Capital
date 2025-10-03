import test from "node:test";
import {
  equal as assertEquals,
  match as assertMatch,
  throws as assertThrows,
} from "node:assert/strict";

import {
  TONKEEPER_APP_SCHEME,
  TONKEEPER_UNIVERSAL_SCHEME,
  TON_STANDARD_SCHEME,
  buildDynamicTransferLink,
  buildTonkeeperLink,
  resolveTonkeeperScheme,
} from "../shared/ton/tonkeeper.ts";

test("resolveTonkeeperScheme prefers Tonkeeper app on mobile when requested", () => {
  const scheme = resolveTonkeeperScheme({ prefersApp: true, isMobile: true });
  assertEquals(scheme, TONKEEPER_APP_SCHEME);
});

test("resolveTonkeeperScheme falls back to ton:// when mobile without app preference", () => {
  const scheme = resolveTonkeeperScheme({ isMobile: true });
  assertEquals(scheme, TON_STANDARD_SCHEME);
});

test("resolveTonkeeperScheme infers platform hints", () => {
  const platformScheme = resolveTonkeeperScheme({
    prefersApp: true,
    platform: "iOS",
  });
  assertEquals(platformScheme, TONKEEPER_APP_SCHEME);

  const userAgentScheme = resolveTonkeeperScheme({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
    prefersApp: true,
  });
  assertEquals(userAgentScheme, TONKEEPER_APP_SCHEME);

  const desktopScheme = resolveTonkeeperScheme({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  });
  assertEquals(desktopScheme, TONKEEPER_UNIVERSAL_SCHEME);
});

test("buildTonkeeperLink constructs canonical URLs", () => {
  const link = buildTonkeeperLink(TONKEEPER_UNIVERSAL_SCHEME, "transfer/EQA123", {
    amount: 1250000000,
    text: "Desk deposit",
    empty: "",
    optional: undefined,
  });
  assertEquals(
    link,
    "https://app.tonkeeper.com/transfer/EQA123?amount=1250000000&text=Desk+deposit",
  );
});

test("buildDynamicTransferLink trims addresses and encodes params", () => {
  const link = buildDynamicTransferLink(TON_STANDARD_SCHEME, {
    address: " EQC1234567890 ",
    text: "Dynamic Capital Treasury",
    exp: 1_700_000_000,
  });
  assertEquals(
    link,
    "ton://transfer/EQC1234567890?text=Dynamic+Capital+Treasury&exp=1700000000",
  );
});

test("buildDynamicTransferLink rejects missing addresses", () => {
  assertThrows(
    () =>
      buildDynamicTransferLink(TONKEEPER_UNIVERSAL_SCHEME, {
        address: "   ",
      }),
    (error: unknown) => {
      assertMatch(String(error), /address is required/i);
      return true;
    },
  );
});
