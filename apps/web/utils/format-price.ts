/**
 * Format a numeric amount as a currency string.
 *
 * @param amount - The numeric value to format.
 * @param currency - ISO 4217 currency code. Defaults to "USD".
 * @param locale - BCP 47 locale string. Defaults to "en-US".
 * @param options - Additional {@link Intl.NumberFormat} options. By default
 *                  the result is rounded to the nearest whole currency unit.
 */
export function formatPrice(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
  options: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}
