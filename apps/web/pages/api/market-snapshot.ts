import type { NextApiRequest, NextApiResponse } from "next";

type AwesomeDailyEntry = {
  bid: string;
  ask: string;
  pctChange: string;
  varBid: string;
  timestamp: string;
  high: string;
  low: string;
  create_date: string;
};

type MarketTimeseriesPoint = {
  timestamp: string;
  value: number;
};

type MarketAssetPayload = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  changeValue: number;
  currency: string;
  source: string;
  timeseries: MarketTimeseriesPoint[];
};

type MarketCategoryPayload = {
  id: "currencies" | "commodities" | "indices" | "cryptocurrencies";
  title: string;
  description: string;
  accentColor: string;
  assets: MarketAssetPayload[];
};

type MarketSnapshotPayload = {
  updatedAt: string;
  categories: MarketCategoryPayload[];
};

const AWESOME_HEADERS = {
  "User-Agent": "Dynamic-Capital-MarketSnapshot/1.0",
  Accept: "application/json",
};

const CURRENCY_CONFIG = [
  { pair: "USD-BRL", display: "USD/BRL", name: "US Dollar vs Brazilian Real" },
  { pair: "EUR-USD", display: "EUR/USD", name: "Euro vs US Dollar" },
  { pair: "GBP-USD", display: "GBP/USD", name: "British Pound vs US Dollar" },
  { pair: "JPY-USD", display: "JPY/USD", name: "Japanese Yen vs US Dollar" },
] as const;

const COMMODITY_CONFIG = [
  { pair: "XAU-USD", display: "XAU/USD", name: "Gold Spot" },
  { pair: "XAG-USD", display: "XAG/USD", name: "Silver Spot" },
  { pair: "XBR-USD", display: "XBR/USD", name: "Brent Crude Oil" },
] as const;

const INDEX_CONFIG = [
  { symbol: "spx.us", display: "SPX", name: "S&P 500" },
  { symbol: "nasdaq100.us", display: "NDX", name: "Nasdaq 100" },
  { symbol: "dji.us", display: "DJI", name: "Dow Jones Industrial" },
] as const;

const COINGECKO_IDS = ["bitcoin", "ethereum", "solana", "chainlink"];

const COINGECKO_ENDPOINT =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&price_change_percentage=24h&sparkline=true&ids=" +
  COINGECKO_IDS.join(",");

async function fetchAwesomeSeries(pair: string, limit = 14) {
  const response = await fetch(
    `https://economia.awesomeapi.com.br/json/daily/${pair}/${limit}`,
    { headers: AWESOME_HEADERS },
  );

  if (!response.ok) {
    throw new Error(`Failed to load AwesomeAPI series for ${pair}`);
  }

  const payload = (await response.json()) as AwesomeDailyEntry[];

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error(`No data returned for ${pair}`);
  }

  return payload;
}

function buildAwesomeAsset(
  entries: AwesomeDailyEntry[],
  meta: { display: string; name: string },
  quoteCurrency: string,
): MarketAssetPayload {
  const sorted = entries
    .slice()
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2] ?? latest;

  const price = Number(latest.bid);
  const prevPrice = Number(previous.bid);
  const changeValue = Number(latest.varBid);
  const changePercent = prevPrice
    ? ((price - prevPrice) / prevPrice) * 100
    : Number(latest.pctChange);

  const timeseries: MarketTimeseriesPoint[] = sorted.map((point) => ({
    timestamp: new Date(Number(point.timestamp) * 1000).toISOString(),
    value: Number(point.bid),
  }));

  return {
    symbol: meta.display,
    name: meta.name,
    price,
    changePercent,
    changeValue,
    currency: quoteCurrency,
    source: "AwesomeAPI",
    timeseries,
  };
}

async function fetchIndexSeries(symbol: string, limit = 30) {
  const response = await fetch(`https://stooq.com/q/d/l/?s=${symbol}&i=d`);

  if (!response.ok) {
    throw new Error(`Failed to load index series for ${symbol}`);
  }

  const text = await response.text();

  if (!text || text.trim().toLowerCase().startsWith("no data")) {
    throw new Error(`No data returned for ${symbol}`);
  }

  const lines = text.trim().split("\n");
  const [, ...rows] = lines;
  const sliced = rows.slice(-limit);

  return sliced
    .map((line) => {
      const [date, , , , close] = line.split(",");
      const value = Number(close);

      if (!date || Number.isNaN(value)) {
        return null;
      }

      return {
        timestamp: new Date(`${date}T00:00:00Z`).toISOString(),
        value,
      } satisfies MarketTimeseriesPoint;
    })
    .filter((point): point is MarketTimeseriesPoint => Boolean(point));
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarketSnapshotPayload | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const [currencyResults, commodityResults, indexResults, cryptoResponse] =
      await Promise.all([
        Promise.all(
          CURRENCY_CONFIG.map(async (config) => {
            const series = await fetchAwesomeSeries(config.pair);
            const parts = config.pair.split("-");
            const quote = parts[1] ?? "USD";
            return buildAwesomeAsset(series, config, quote);
          }),
        ),
        Promise.all(
          COMMODITY_CONFIG.map(async (config) => {
            const series = await fetchAwesomeSeries(config.pair);
            const parts = config.pair.split("-");
            const quote = parts[1] ?? "USD";
            return buildAwesomeAsset(series, config, quote);
          }),
        ),
        Promise.all(
          INDEX_CONFIG.map(async (config) => {
            const series = await fetchIndexSeries(config.symbol);
            if (series.length === 0) {
              throw new Error(`No index data for ${config.symbol}`);
            }

            const sorted = series.slice().sort((a, b) =>
              Number(new Date(a.timestamp)) - Number(new Date(b.timestamp))
            );
            const latest = sorted[sorted.length - 1];
            const previous = sorted[sorted.length - 2] ?? latest;
            const changeValue = latest.value - previous.value;
            const changePercent = previous.value
              ? (changeValue / previous.value) * 100
              : 0;

            return {
              symbol: config.display,
              name: config.name,
              price: latest.value,
              changePercent,
              changeValue,
              currency: "USD",
              source: "Stooq",
              timeseries: sorted,
            } satisfies MarketAssetPayload;
          }),
        ),
        fetch(COINGECKO_ENDPOINT),
      ]);

    if (!cryptoResponse.ok) {
      throw new Error("Failed to load crypto data from CoinGecko");
    }

    const cryptoPayload = (await cryptoResponse.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h_in_currency: number | null;
      price_change_24h_in_currency?: number | null;
      sparkline_in_7d?: { price: number[] };
    }>;

    const cryptoResults: MarketAssetPayload[] = cryptoPayload.map((asset) => {
      const sparkline = asset.sparkline_in_7d?.price ?? [];
      const now = Date.now();
      const intervalMs = sparkline.length > 1
        ? Math.floor((7 * 24 * 60 * 60 * 1000) / sparkline.length)
        : 60 * 60 * 1000;

      const timeseries: MarketTimeseriesPoint[] = sparkline.map((
        value,
        index,
      ) => ({
        timestamp: new Date(now - intervalMs * (sparkline.length - index - 1))
          .toISOString(),
        value,
      }));

      const changePercent = asset.price_change_percentage_24h_in_currency ?? 0;
      const changeValue = asset.price_change_24h_in_currency ?? 0;

      return {
        symbol: asset.symbol.toUpperCase(),
        name: asset.name,
        price: asset.current_price,
        changePercent,
        changeValue,
        currency: "USD",
        source: "CoinGecko",
        timeseries,
      } satisfies MarketAssetPayload;
    });

    const payload: MarketSnapshotPayload = {
      updatedAt: new Date().toISOString(),
      categories: [
        {
          id: "currencies",
          title: "Currencies",
          description:
            "Major FX pairs tracked directly from AwesomeAPI daily candles.",
          accentColor: "#2563eb",
          assets: currencyResults,
        },
        {
          id: "commodities",
          title: "Commodities",
          description:
            "Spot benchmarks for gold, silver, and Brent crude priced in USD.",
          accentColor: "#d97706",
          assets: commodityResults,
        },
        {
          id: "indices",
          title: "Indices",
          description:
            "Equity index levels captured from Stooq historical feeds.",
          accentColor: "#14b8a6",
          assets: indexResults,
        },
        {
          id: "cryptocurrencies",
          title: "Cryptocurrencies",
          description:
            "Top on-chain assets streaming from the public CoinGecko market feed.",
          accentColor: "#7c3aed",
          assets: cryptoResults,
        },
      ],
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error("market-snapshot", error);
    return res.status(500).json({ error: "Failed to load market snapshot" });
  }
}

export default handler;
