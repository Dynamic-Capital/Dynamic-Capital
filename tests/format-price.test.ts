import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";

import { formatPrice } from "../apps/web/utils/format-price.ts";

test("formatPrice defaults to whole currency units", () => {
  assertEquals(formatPrice(1234.56, "USD"), "$1,235");
});

test("formatPrice supports custom locale and fraction digits", () => {
  const result = formatPrice(1234.56, "USD", "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  assertEquals(result, "$1,234.56");
});
