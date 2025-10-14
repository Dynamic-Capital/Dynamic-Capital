import { assertEquals } from "std/assert/mod.ts";

import { formatPrice } from "../format-price.ts";

Deno.test("formatPrice reuses memoized number formatters", () => {
  const originalNumberFormat = Intl.NumberFormat;
  let callCount = 0;

  const spy = function (
    this: Intl.NumberFormat,
    ...args: ConstructorParameters<typeof Intl.NumberFormat>
  ) {
    callCount += 1;
    return new originalNumberFormat(...args);
  } as typeof Intl.NumberFormat;

  Intl.NumberFormat = spy;

  try {
    const first = formatPrice(1234.56, "USD", "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const second = formatPrice(789.01, "USD", "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const euro = formatPrice(1234.56, "EUR", "de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    assertEquals(first, "$1,234.56");
    assertEquals(second, "$789.01");
    assertEquals(euro, "1.234,56 €");
    assertEquals(callCount, 2);
  } finally {
    Intl.NumberFormat = originalNumberFormat;
  }
});
