import { optionalEnvVar } from "@/utils/env.ts";

const DEX_SCREENER_FETCH_OVERRIDE = Symbol.for(
  "dynamic-capital.dex-screener.fetch-override",
);

const DEX_SCREENER_API_BASE_URL = "https://api.dexscreener.com" as const;

export const DEX_SCREENER_API_ENDPOINTS = Object.freeze({
  latestProfiles: "/token-profiles/latest/v1",
  latestBoosts: "/token-boosts/latest/v1",
  topBoosts: "/token-boosts/top/v1",
} as const);

const DEFAULT_TIMEOUT_MS = 7_500;
const MAX_RESULTS = 20;

const DEFAULT_DEX_SCREENER_CACHE_TTL_SECONDS = 120;

function resolveDexScreenerCacheTtl(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_DEX_SCREENER_CACHE_TTL_SECONDS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_DEX_SCREENER_CACHE_TTL_SECONDS;
  }

  return parsed;
}

export const DEX_SCREENER_CACHE_TAG = "dex-screener" as const;

export const DEX_SCREENER_CACHE_TTL_SECONDS = resolveDexScreenerCacheTtl(
  optionalEnvVar("DEX_SCREENER_CACHE_TTL_SECONDS", [
    "DEX_CACHE_TTL_SECONDS",
    "CACHE_TTL_SECONDS",
  ]),
);

export const DEX_SCREENER_CACHE_CONTROL_HEADER =
  `public, max-age=0, s-maxage=${DEX_SCREENER_CACHE_TTL_SECONDS}, stale-while-revalidate=86400` as const;

const DEX_SCREENER_RESPONSE_CACHE = Object.freeze({
  ttlSeconds: DEX_SCREENER_CACHE_TTL_SECONDS,
  control: DEX_SCREENER_CACHE_CONTROL_HEADER,
  tags: Object.freeze([DEX_SCREENER_CACHE_TAG]) as readonly string[],
});

const DEX_SCREENER_RESPONSE_LIMITS = Object.freeze({
  maxResults: MAX_RESULTS,
});

const DEX_SCREENER_RESPONSE_METADATA = Object.freeze({
  version: 1,
  repository: "Dynamic Capital",
  source: "DEX Screener API",
  cache: DEX_SCREENER_RESPONSE_CACHE,
  limits: DEX_SCREENER_RESPONSE_LIMITS,
  endpoints: DEX_SCREENER_API_ENDPOINTS,
});

export type DexScreenerResponseMetadata = typeof DEX_SCREENER_RESPONSE_METADATA;

const EMPTY_LINKS = Object.freeze([]) as readonly DexScreenerLink[];
const EMPTY_PROFILES = Object.freeze([]) as readonly DexScreenerProfile[];
const EMPTY_BOOSTS = Object.freeze([]) as readonly DexScreenerBoost[];
const EMPTY_ERRORS = Object.freeze([]) as readonly DexScreenerError[];

export type DexScreenerStatus = "ok" | "partial" | "error";

export interface DexScreenerLink {
  readonly type?: string;
  readonly label?: string;
  readonly url: string;
}

export interface DexScreenerProfile {
  readonly url: string;
  readonly chainId: string;
  readonly tokenAddress: string;
  readonly description?: string;
  readonly icon?: string;
  readonly header?: string;
  readonly openGraph?: string;
  readonly links: readonly DexScreenerLink[];
}

export interface DexScreenerBoost extends DexScreenerProfile {
  readonly amount?: number;
  readonly totalAmount?: number;
}

export interface DexScreenerError {
  readonly endpoint: string;
  readonly message: string;
}

export interface DexScreenerSnapshot {
  readonly status: DexScreenerStatus;
  readonly profiles: readonly DexScreenerProfile[];
  readonly latestBoosts: readonly DexScreenerBoost[];
  readonly topBoosts: readonly DexScreenerBoost[];
  readonly errors: readonly DexScreenerError[];
}

export interface DexScreenerResource {
  readonly status: DexScreenerStatus;
  readonly endpoints: typeof DEX_SCREENER_API_ENDPOINTS;
  readonly totals: Readonly<{
    profiles: number;
    latestBoosts: number;
    topBoosts: number;
  }>;
  readonly latestProfiles: readonly DexScreenerProfile[];
  readonly latestBoosts: readonly DexScreenerBoost[];
  readonly topBoosts: readonly DexScreenerBoost[];
  readonly errors?: readonly DexScreenerError[];
}

const buildDexScreenerMetadata = (): DexScreenerResponseMetadata =>
  DEX_SCREENER_RESPONSE_METADATA;

export interface DexScreenerResponseEnvelope {
  readonly status: "ok";
  readonly generatedAt: string;
  readonly metadata: DexScreenerResponseMetadata;
  readonly resource: DexScreenerResource;
}

interface DexScreenerRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

type FetchSnapshotOptions = DexScreenerRequestOptions;

function getFetch(): typeof fetch {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    DEX_SCREENER_FETCH_OVERRIDE
  ];
  if (typeof override === "function") {
    return override as typeof fetch;
  }
  return fetch;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normaliseString(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normaliseUrl(value: unknown): string | undefined {
  const asString = normaliseString(value);
  if (!asString) {
    return undefined;
  }
  try {
    const url = new URL(asString);
    if (!url.protocol || !url.hostname) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function normaliseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function buildTokenKey(chainId: string, tokenAddress: string): string {
  return `${chainId.toLowerCase()}:${tokenAddress.toLowerCase()}`;
}

function normaliseLinks(value: unknown): readonly DexScreenerLink[] {
  if (!Array.isArray(value) || value.length === 0) {
    return EMPTY_LINKS;
  }

  const entries: DexScreenerLink[] = [];
  const seen = new Set<string>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const mapping = candidate as Record<string, unknown>;
    const url = normaliseUrl(mapping.url);
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    const type = normaliseString(mapping.type);
    const label = normaliseString(mapping.label);
    entries.push(
      Object.freeze({
        type,
        label,
        url,
      }) satisfies DexScreenerLink,
    );
  }

  return entries.length > 0
    ? Object.freeze(entries) as readonly DexScreenerLink[]
    : EMPTY_LINKS;
}

function normaliseProfile(candidate: unknown): DexScreenerProfile | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const mapping = candidate as Record<string, unknown>;
  const url = normaliseUrl(mapping.url);
  const chainId = normaliseString(mapping.chainId);
  const tokenAddress = normaliseString(mapping.tokenAddress);

  if (!url || !chainId || !tokenAddress) {
    return null;
  }

  const description = normaliseString(mapping.description);
  const icon = normaliseUrl(mapping.icon);
  const header = normaliseUrl(mapping.header);
  const openGraph = normaliseUrl(mapping.openGraph ?? mapping.opengraph);
  const links = normaliseLinks(mapping.links);

  return Object.freeze({
    url,
    chainId,
    tokenAddress,
    description,
    icon,
    header,
    openGraph,
    links,
  }) satisfies DexScreenerProfile;
}

function normaliseProfilesCollection(
  value: unknown,
): readonly DexScreenerProfile[] {
  if (!Array.isArray(value) || value.length === 0) {
    return EMPTY_PROFILES;
  }

  const profiles: DexScreenerProfile[] = [];
  const seen = new Set<string>();

  for (const candidate of value) {
    const profile = normaliseProfile(candidate);
    if (!profile) {
      continue;
    }

    const key = buildTokenKey(profile.chainId, profile.tokenAddress);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    profiles.push(profile);
    if (profiles.length >= MAX_RESULTS) {
      break;
    }
  }

  return profiles.length > 0
    ? Object.freeze(profiles) as readonly DexScreenerProfile[]
    : EMPTY_PROFILES;
}

function normaliseBoost(candidate: unknown): DexScreenerBoost | null {
  const profile = normaliseProfile(candidate);
  if (!profile) {
    return null;
  }

  const mapping = candidate as Record<string, unknown>;
  const amount = normaliseNumber(mapping.amount);
  const totalAmount = normaliseNumber(mapping.totalAmount);

  return Object.freeze({
    ...profile,
    amount,
    totalAmount,
  }) satisfies DexScreenerBoost;
}

function normaliseBoostsCollection(
  value: unknown,
): readonly DexScreenerBoost[] {
  if (!Array.isArray(value) || value.length === 0) {
    return EMPTY_BOOSTS;
  }

  const boosts: DexScreenerBoost[] = [];
  const seen = new Set<string>();

  for (const candidate of value) {
    const boost = normaliseBoost(candidate);
    if (!boost) {
      continue;
    }

    const key = buildTokenKey(boost.chainId, boost.tokenAddress);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    boosts.push(boost);
    if (boosts.length >= MAX_RESULTS) {
      break;
    }
  }

  return boosts.length > 0
    ? Object.freeze(boosts) as readonly DexScreenerBoost[]
    : EMPTY_BOOSTS;
}

function normaliseErrorMessage(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim();
  }
  return "Unknown error";
}

async function fetchDexScreenerJson<T>(
  endpoint: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: DexScreenerRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const fetcher = getFetch();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let externalAbortHandler: (() => void) | undefined;
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      signal.addEventListener("abort", externalAbortHandler);
    }
  }

  const url = `${DEX_SCREENER_API_BASE_URL}${endpoint}`;

  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const detail = body ? ` ${body}` : "";
      throw new Error(
        `Dex Screener request failed (${response.status}).${detail}`.trim(),
      );
    }

    const rawBody = await response.text();
    try {
      return JSON.parse(rawBody) as T;
    } catch (error) {
      throw new Error(
        "Dex Screener response was not valid JSON.",
        error instanceof Error ? { cause: error } : undefined,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (signal?.aborted) {
        throw new Error("Dex Screener request was cancelled.");
      }
      throw new Error("Dex Screener request timed out.");
    }
    throw error instanceof Error
      ? error
      : new Error("Dex Screener request failed.");
  } finally {
    clearTimeout(timeout);
    if (externalAbortHandler) {
      signal?.removeEventListener("abort", externalAbortHandler);
    }
  }
}

async function fetchLatestTokenProfiles(
  options?: DexScreenerRequestOptions,
): Promise<readonly DexScreenerProfile[]> {
  const payload = await fetchDexScreenerJson<unknown>(
    DEX_SCREENER_API_ENDPOINTS.latestProfiles,
    options,
  );
  return normaliseProfilesCollection(payload);
}

async function fetchLatestTokenBoosts(
  options?: DexScreenerRequestOptions,
): Promise<readonly DexScreenerBoost[]> {
  const payload = await fetchDexScreenerJson<unknown>(
    DEX_SCREENER_API_ENDPOINTS.latestBoosts,
    options,
  );
  return normaliseBoostsCollection(payload);
}

async function fetchTopTokenBoosts(
  options?: DexScreenerRequestOptions,
): Promise<readonly DexScreenerBoost[]> {
  const payload = await fetchDexScreenerJson<unknown>(
    DEX_SCREENER_API_ENDPOINTS.topBoosts,
    options,
  );
  return normaliseBoostsCollection(payload);
}

export async function fetchDexScreenerSnapshot(
  options?: FetchSnapshotOptions,
): Promise<DexScreenerSnapshot> {
  const errors: DexScreenerError[] = [];
  let profiles: readonly DexScreenerProfile[] = EMPTY_PROFILES;
  let latestBoosts: readonly DexScreenerBoost[] = EMPTY_BOOSTS;
  let topBoosts: readonly DexScreenerBoost[] = EMPTY_BOOSTS;
  let successes = 0;

  const tasks = [
    {
      endpoint: DEX_SCREENER_API_ENDPOINTS.latestProfiles,
      assign: (value: readonly DexScreenerProfile[]) => {
        profiles = value;
      },
      run: () => fetchLatestTokenProfiles(options),
    },
    {
      endpoint: DEX_SCREENER_API_ENDPOINTS.latestBoosts,
      assign: (value: readonly DexScreenerBoost[]) => {
        latestBoosts = value;
      },
      run: () => fetchLatestTokenBoosts(options),
    },
    {
      endpoint: DEX_SCREENER_API_ENDPOINTS.topBoosts,
      assign: (value: readonly DexScreenerBoost[]) => {
        topBoosts = value;
      },
      run: () => fetchTopTokenBoosts(options),
    },
  ] as const;

  const results = await Promise.allSettled(tasks.map((task) => task.run()));

  results.forEach((result, index) => {
    const task = tasks[index];
    if (result.status === "fulfilled") {
      successes += 1;
      task.assign(result.value);
      return;
    }
    const message = normaliseErrorMessage(result.reason);
    errors.push(
      Object.freeze({
        endpoint: task.endpoint,
        message,
      }) satisfies DexScreenerError,
    );
  });

  let status: DexScreenerStatus = "error";
  if (successes === tasks.length) {
    status = "ok";
  } else if (successes > 0) {
    status = "partial";
  }

  return {
    status,
    profiles,
    latestBoosts,
    topBoosts,
    errors: errors.length > 0
      ? Object.freeze(errors) as readonly DexScreenerError[]
      : EMPTY_ERRORS,
  } satisfies DexScreenerSnapshot;
}

export async function buildDexScreenerResource(
  options?: FetchSnapshotOptions,
): Promise<DexScreenerResource> {
  try {
    const snapshot = await fetchDexScreenerSnapshot(options);
    const totals = Object.freeze({
      profiles: snapshot.profiles.length,
      latestBoosts: snapshot.latestBoosts.length,
      topBoosts: snapshot.topBoosts.length,
    });

    return Object.freeze({
      status: snapshot.status,
      endpoints: DEX_SCREENER_API_ENDPOINTS,
      totals,
      latestProfiles: snapshot.profiles,
      latestBoosts: snapshot.latestBoosts,
      topBoosts: snapshot.topBoosts,
      errors: snapshot.errors.length > 0 ? snapshot.errors : undefined,
    }) satisfies DexScreenerResource;
  } catch (error) {
    const fallbackError = Object.freeze([
      Object.freeze({
        endpoint: "snapshot",
        message: normaliseErrorMessage(error),
      }) satisfies DexScreenerError,
    ]) as readonly DexScreenerError[];

    return Object.freeze({
      status: "error" as const,
      endpoints: DEX_SCREENER_API_ENDPOINTS,
      totals: Object.freeze({
        profiles: 0,
        latestBoosts: 0,
        topBoosts: 0,
      }),
      latestProfiles: EMPTY_PROFILES,
      latestBoosts: EMPTY_BOOSTS,
      topBoosts: EMPTY_BOOSTS,
      errors: fallbackError,
    });
  }
}

export async function buildDexScreenerResponse(
  now: Date = new Date(),
): Promise<DexScreenerResponseEnvelope> {
  const resource = await buildDexScreenerResource();
  const envelope = Object.freeze({
    status: "ok" as const,
    generatedAt: now.toISOString(),
    metadata: buildDexScreenerMetadata(),
    resource,
  }) satisfies DexScreenerResponseEnvelope;
  return envelope;
}

export function __setDexScreenerFetchOverride(
  override: typeof fetch | undefined,
): void {
  const globalObject = globalThis as Record<PropertyKey, unknown>;
  if (override) {
    globalObject[DEX_SCREENER_FETCH_OVERRIDE] = override;
    return;
  }
  delete globalObject[DEX_SCREENER_FETCH_OVERRIDE];
}

export { DEX_SCREENER_API_BASE_URL };
