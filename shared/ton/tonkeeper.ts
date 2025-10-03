export const TON_STANDARD_SCHEME = "ton://" as const;
export const TONKEEPER_APP_SCHEME = "tonkeeper://" as const;
export const TONKEEPER_UNIVERSAL_SCHEME = "https://app.tonkeeper.com/" as const;

export type TonkeeperScheme =
  | typeof TON_STANDARD_SCHEME
  | typeof TONKEEPER_APP_SCHEME
  | typeof TONKEEPER_UNIVERSAL_SCHEME;

const MOBILE_PLATFORM_HINTS = [
  "android",
  "ios",
  "iphone",
  "ipad",
  "ipados",
] as const;

const DESKTOP_PLATFORM_HINTS = [
  "mac",
  "macos",
  "mac os",
  "linux",
  "windows",
  "tdesktop",
  "web",
] as const;

const MOBILE_USER_AGENT_PATTERN =
  /(android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile)/i;

function coalesceBoolean(
  ...values: Array<boolean | null | undefined>
): boolean | undefined {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

function detectMobileFromPlatform(platform?: string | null):
  | boolean
  | undefined {
  if (!platform) return undefined;
  const normalized = platform.trim().toLowerCase();
  if (!normalized) return undefined;
  if (MOBILE_PLATFORM_HINTS.some((hint) => normalized.includes(hint))) {
    return true;
  }
  if (DESKTOP_PLATFORM_HINTS.some((hint) => normalized.includes(hint))) {
    return false;
  }
  return undefined;
}

function detectMobileFromUserAgent(userAgent?: string | null):
  | boolean
  | undefined {
  if (!userAgent) return undefined;
  return MOBILE_USER_AGENT_PATTERN.test(userAgent);
}

export type ResolveTonkeeperSchemeOptions = {
  prefersApp?: boolean;
  isMobile?: boolean;
  fallback?: TonkeeperScheme;
  platform?: string | null;
  userAgent?: string | null;
};

export function resolveTonkeeperScheme(
  options: ResolveTonkeeperSchemeOptions = {},
): TonkeeperScheme {
  const fallback = options.fallback ?? TONKEEPER_UNIVERSAL_SCHEME;
  const inferredMobile = coalesceBoolean(
    options.isMobile,
    detectMobileFromPlatform(options.platform),
    detectMobileFromUserAgent(options.userAgent),
  );
  const isMobile = inferredMobile ?? false;

  if (options.prefersApp && isMobile) {
    return TONKEEPER_APP_SCHEME;
  }
  if (isMobile) {
    return TON_STANDARD_SCHEME;
  }
  return fallback;
}

type TonkeeperQueryValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined;

export type TonkeeperQuery = Record<string, TonkeeperQueryValue>;

function ensureHttpSchemeTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinSchemeAndPath(scheme: TonkeeperScheme, path: string): string {
  const sanitizedPath = path.replace(/^\/+/, "").trim();
  const isHttp = scheme.startsWith("http");

  if (!sanitizedPath) {
    return isHttp ? ensureHttpSchemeTrailingSlash(scheme) : scheme;
  }

  if (isHttp) {
    return `${ensureHttpSchemeTrailingSlash(scheme)}${sanitizedPath}`;
  }

  return `${scheme}${sanitizedPath}`;
}

function toQueryValue(value: TonkeeperQueryValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value.toString(10);
  }
  if (typeof value === "bigint") {
    return value.toString(10);
  }
  return value ? "true" : "false";
}

export function buildTonkeeperLink(
  scheme: TonkeeperScheme,
  path: string,
  query: TonkeeperQuery = {},
): string {
  const base = joinSchemeAndPath(scheme, path);
  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    const value = toQueryValue(rawValue);
    if (value === null) continue;
    if (!key || typeof key !== "string") continue;
    searchParams.append(key, value);
  }

  const suffix = searchParams.toString();
  return suffix ? `${base}?${suffix}` : base;
}

export type TonkeeperTransferOptions = {
  address: string;
  amount?: TonkeeperQueryValue;
  text?: TonkeeperQueryValue;
  bin?: TonkeeperQueryValue;
  jetton?: TonkeeperQueryValue;
  exp?: TonkeeperQueryValue;
};

function sanitizeAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error("Tonkeeper transfer address is required");
  }
  return trimmed;
}

export function buildDynamicTransferLink(
  scheme: TonkeeperScheme,
  { address, amount, text, bin, jetton, exp }: TonkeeperTransferOptions,
): string {
  const normalizedAddress = sanitizeAddress(address);
  const route = `transfer/${normalizedAddress}`;

  return buildTonkeeperLink(scheme, route, {
    amount,
    text,
    bin,
    jetton,
    exp,
  });
}
