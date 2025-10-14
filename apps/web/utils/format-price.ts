/**
 * Format a numeric amount as a currency string.
 *
 * @param amount - The numeric value to format.
 * @param currency - ISO 4217 currency code. Defaults to "USD".
 * @param locale - BCP 47 locale string. Defaults to "en-US".
 * @param options - Additional {@link Intl.NumberFormat} options. By default
 *                  the result is rounded to the nearest whole currency unit.
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

const DEFAULT_OPTIONS: Readonly<Intl.NumberFormatOptions> = Object.freeze({
  style: "currency",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const buildCacheKey = (
  locale: string,
  resolvedOptions: Intl.NumberFormatOptions,
) => {
  const entries = Object.entries(resolvedOptions)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, value]);

  return `${locale}:${JSON.stringify(entries)}`;
};

function getFormatter(
  locale: string,
  currency: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const resolvedOptions: Intl.NumberFormatOptions = {
    ...DEFAULT_OPTIONS,
    currency,
    ...options,
  };

  const cacheKey = buildCacheKey(locale, resolvedOptions);
  const cachedFormatter = formatterCache.get(cacheKey);
  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.NumberFormat(locale, resolvedOptions);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatPrice(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
  options: Intl.NumberFormatOptions = {},
) {
  return getFormatter(locale, currency, options).format(amount);
}
