import localizationConfig from "./locales.json";

const FALLBACK_LOCALE = "en";

function normalizeLocale(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

const configuredLocales = Array.isArray(localizationConfig?.locales)
  ? localizationConfig.locales
    .map((locale) => normalizeLocale(locale))
    .filter((locale): locale is string => Boolean(locale))
  : [];

export const SUPPORTED_LOCALES = configuredLocales.length > 0
  ? configuredLocales
  : [FALLBACK_LOCALE];

const configuredDefault = normalizeLocale(localizationConfig?.defaultLocale);

export const DEFAULT_LOCALE =
  configuredDefault && SUPPORTED_LOCALES.includes(configuredDefault)
    ? configuredDefault
    : SUPPORTED_LOCALES[0];
