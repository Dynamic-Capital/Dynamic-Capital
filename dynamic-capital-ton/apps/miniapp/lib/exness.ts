import "server-only";

export type ExnessAccountSummary = {
  balance: number;
  equity: number;
  freeMargin: number;
  marginLevel: number;
  updatedAt: string;
};

export type ExnessPosition = {
  ticket: string;
  symbol: string;
  volume: number;
  direction: "buy" | "sell";
  openPrice: number;
  currentPrice: number;
  profit: number;
  openTime: string;
};

export type ExnessEquityPoint = {
  timestamp: string;
  equity: number;
  balance: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  source: DataSource;
};

type DataSource = "api" | "cache" | "static";

const DEFAULT_TTL = 30 * 1000;
const cache = new Map<string, CacheEntry<unknown>>();

const {
  EXNESS_MT5_LOGIN,
  EXNESS_MT5_PASSWORD,
  EXNESS_MT5_SERVER,
  EXNESS_API_BASE_URL,
} = process.env;

const credentials = {
  login: EXNESS_MT5_LOGIN,
  password: EXNESS_MT5_PASSWORD,
  server: EXNESS_MT5_SERVER,
};

const FALLBACK_SUMMARY: ExnessAccountSummary = {
  balance: 125_640.42,
  equity: 128_935.16,
  freeMargin: 84_210.12,
  marginLevel: 156.8,
  updatedAt: new Date().toISOString(),
};

const FALLBACK_POSITIONS: ExnessPosition[] = [
  {
    ticket: "87451230",
    symbol: "XAUUSD",
    volume: 1.25,
    direction: "buy",
    openPrice: 2365.18,
    currentPrice: 2384.32,
    profit: 2_386.25,
    openTime: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    ticket: "87451244",
    symbol: "TONUSDT",
    volume: 4.2,
    direction: "sell",
    openPrice: 5.12,
    currentPrice: 4.87,
    profit: 1_050.4,
    openTime: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    ticket: "87451257",
    symbol: "EURUSD",
    volume: 1.8,
    direction: "buy",
    openPrice: 1.0812,
    currentPrice: 1.0927,
    profit: 1_723.46,
    openTime: new Date(Date.now() - 1000 * 60 * 60 * 34).toISOString(),
  },
];

const FALLBACK_EQUITY: ExnessEquityPoint[] = Array.from({ length: 8 }).map((_, index) => {
  const timestamp = new Date(Date.now() - (7 - index) * 1000 * 60 * 60 * 12);
  const baseEquity = 118_000 + index * 1_650 + (index % 2 === 0 ? 420 : 0);
  return {
    timestamp: timestamp.toISOString(),
    equity: baseEquity,
    balance: baseEquity - 1_200 + (index % 3 === 0 ? 800 : 0),
  };
});

function getCachedValue<T>(key: string): CacheEntry<T> | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return { ...entry, source: "cache" };
}

function setCachedValue<T>(key: string, value: T, source: DataSource): void {
  cache.set(key, {
    value,
    source,
    expiresAt: Date.now() + DEFAULT_TTL,
  });
}

function hasCredentials(): boolean {
  return Boolean(
    credentials.login && credentials.password && credentials.server && EXNESS_API_BASE_URL,
  );
}

type ApiResult<T> = { data: T; source: DataSource };

async function callExnessApi<T>(
  endpoint: string,
  fallback: T,
): Promise<ApiResult<T>> {
  const cached = getCachedValue<T>(endpoint);
  if (cached) {
    return { data: cached.value, source: cached.source };
  }

  if (!hasCredentials()) {
    setCachedValue(endpoint, fallback, "static");
    return { data: fallback, source: "static" };
  }

  try {
    const response = await fetch(`${EXNESS_API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Exness API responded with status ${response.status}`);
    }

    const payload = (await response.json()) as T;
    setCachedValue(endpoint, payload, "api");
    return { data: payload, source: "api" };
  } catch (error) {
    console.error("Failed to load Exness data", error);
    setCachedValue(endpoint, fallback, "static");
    return { data: fallback, source: "static" };
  }
}

export async function getAccountSummary(): Promise<ApiResult<ExnessAccountSummary>> {
  return callExnessApi("/account/summary", FALLBACK_SUMMARY);
}

export async function getOpenPositions(): Promise<ApiResult<ExnessPosition[]>> {
  return callExnessApi("/account/positions", FALLBACK_POSITIONS);
}

export async function getEquityHistory(): Promise<ApiResult<ExnessEquityPoint[]>> {
  return callExnessApi("/account/equity", FALLBACK_EQUITY);
}
