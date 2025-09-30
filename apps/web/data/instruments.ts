import type { Colors } from "@/components/dynamic-ui-system";

export type AssetClass =
  | "commodities"
  | "currencies"
  | "indices"
  | "crypto"
  | "stocks";

export interface InstrumentMetadata {
  id: string;
  displaySymbol: string;
  name: string;
  assetClass: AssetClass;
  shortCode?: string;
  base?: string;
  quote?: string;
  format?: Intl.NumberFormatOptions;
}

export type InstrumentId = InstrumentMetadata["id"];

const RAW_INSTRUMENTS: InstrumentMetadata[] = [
  {
    id: "XAUUSD",
    displaySymbol: "XAU/USD",
    shortCode: "XAU",
    name: "Spot gold",
    assetClass: "commodities",
    base: "XAU",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "XAGUSD",
    displaySymbol: "XAG/USD",
    shortCode: "XAG",
    name: "Spot silver",
    assetClass: "commodities",
    base: "XAG",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "NGAS",
    displaySymbol: "NGAS",
    name: "Natural gas",
    assetClass: "commodities",
  },
  {
    id: "WHEATF",
    displaySymbol: "WHEATF",
    name: "Wheat futures",
    assetClass: "commodities",
  },
  {
    id: "UKOil",
    displaySymbol: "UKOil",
    name: "Brent crude oil",
    assetClass: "commodities",
  },
  {
    id: "USOil",
    displaySymbol: "USOil",
    name: "WTI crude oil",
    assetClass: "commodities",
  },
  {
    id: "SOYF",
    displaySymbol: "SOYF",
    name: "Soybean futures",
    assetClass: "commodities",
  },
  {
    id: "CORNF",
    displaySymbol: "CORNF",
    name: "Corn futures",
    assetClass: "commodities",
  },
  {
    id: "Copper",
    displaySymbol: "Copper",
    name: "Copper",
    assetClass: "commodities",
  },
  {
    id: "USD",
    displaySymbol: "USD",
    name: "US dollar",
    assetClass: "currencies",
    shortCode: "USD",
  },
  {
    id: "EUR",
    displaySymbol: "EUR",
    name: "Euro",
    assetClass: "currencies",
    shortCode: "EUR",
  },
  {
    id: "JPY",
    displaySymbol: "JPY",
    name: "Japanese yen",
    assetClass: "currencies",
    shortCode: "JPY",
  },
  {
    id: "GBP",
    displaySymbol: "GBP",
    name: "British pound",
    assetClass: "currencies",
    shortCode: "GBP",
  },
  {
    id: "AUD",
    displaySymbol: "AUD",
    name: "Australian dollar",
    assetClass: "currencies",
    shortCode: "AUD",
  },
  {
    id: "NZD",
    displaySymbol: "NZD",
    name: "New Zealand dollar",
    assetClass: "currencies",
    shortCode: "NZD",
  },
  {
    id: "CHF",
    displaySymbol: "CHF",
    name: "Swiss franc",
    assetClass: "currencies",
    shortCode: "CHF",
  },
  {
    id: "CAD",
    displaySymbol: "CAD",
    name: "Canadian dollar",
    assetClass: "currencies",
    shortCode: "CAD",
  },
  {
    id: "EURUSD",
    displaySymbol: "EUR/USD",
    name: "Euro vs US dollar",
    assetClass: "currencies",
    base: "EUR",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    id: "GBPUSD",
    displaySymbol: "GBP/USD",
    name: "British pound vs US dollar",
    assetClass: "currencies",
    base: "GBP",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    id: "AUDUSD",
    displaySymbol: "AUD/USD",
    name: "Australian dollar vs US dollar",
    assetClass: "currencies",
    base: "AUD",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    id: "NZDUSD",
    displaySymbol: "NZD/USD",
    name: "New Zealand dollar vs US dollar",
    assetClass: "currencies",
    base: "NZD",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    id: "USDCAD",
    displaySymbol: "USD/CAD",
    name: "US dollar vs Canadian dollar",
    assetClass: "currencies",
    base: "USD",
    quote: "CAD",
    format: {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    id: "USDCHF",
    displaySymbol: "USD/CHF",
    name: "US dollar vs Swiss franc",
    assetClass: "currencies",
    base: "USD",
    quote: "CHF",
    format: {
      style: "currency",
      currency: "CHF",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
  },
  {
    id: "USDJPY",
    displaySymbol: "USD/JPY",
    name: "US dollar vs Japanese yen",
    assetClass: "currencies",
    base: "USD",
    quote: "JPY",
    format: {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "EURGBP",
    displaySymbol: "EUR/GBP",
    name: "Euro vs British pound",
    assetClass: "currencies",
    base: "EUR",
    quote: "GBP",
  },
  {
    id: "EURAUD",
    displaySymbol: "EUR/AUD",
    name: "Euro vs Australian dollar",
    assetClass: "currencies",
    base: "EUR",
    quote: "AUD",
  },
  {
    id: "EURNZD",
    displaySymbol: "EUR/NZD",
    name: "Euro vs New Zealand dollar",
    assetClass: "currencies",
    base: "EUR",
    quote: "NZD",
  },
  {
    id: "GBPAUD",
    displaySymbol: "GBP/AUD",
    name: "British pound vs Australian dollar",
    assetClass: "currencies",
    base: "GBP",
    quote: "AUD",
  },
  {
    id: "AUDNZD",
    displaySymbol: "AUD/NZD",
    name: "Australian dollar vs New Zealand dollar",
    assetClass: "currencies",
    base: "AUD",
    quote: "NZD",
  },
  {
    id: "EURJPY",
    displaySymbol: "EUR/JPY",
    name: "Euro vs Japanese yen",
    assetClass: "currencies",
    base: "EUR",
    quote: "JPY",
  },
  {
    id: "GBPJPY",
    displaySymbol: "GBP/JPY",
    name: "British pound vs Japanese yen",
    assetClass: "currencies",
    base: "GBP",
    quote: "JPY",
  },
  {
    id: "AUDJPY",
    displaySymbol: "AUD/JPY",
    name: "Australian dollar vs Japanese yen",
    assetClass: "currencies",
    base: "AUD",
    quote: "JPY",
  },
  {
    id: "NZDJPY",
    displaySymbol: "NZD/JPY",
    name: "New Zealand dollar vs Japanese yen",
    assetClass: "currencies",
    base: "NZD",
    quote: "JPY",
  },
  {
    id: "CADJPY",
    displaySymbol: "CAD/JPY",
    name: "Canadian dollar vs Japanese yen",
    assetClass: "currencies",
    base: "CAD",
    quote: "JPY",
  },
  {
    id: "CHFJPY",
    displaySymbol: "CHF/JPY",
    name: "Swiss franc vs Japanese yen",
    assetClass: "currencies",
    base: "CHF",
    quote: "JPY",
  },
  {
    id: "EURCHF",
    displaySymbol: "EUR/CHF",
    name: "Euro vs Swiss franc",
    assetClass: "currencies",
    base: "EUR",
    quote: "CHF",
  },
  {
    id: "GBPCHF",
    displaySymbol: "GBP/CHF",
    name: "British pound vs Swiss franc",
    assetClass: "currencies",
    base: "GBP",
    quote: "CHF",
  },
  {
    id: "USDSEK",
    displaySymbol: "USD/SEK",
    name: "US dollar vs Swedish krona",
    assetClass: "currencies",
    base: "USD",
    quote: "SEK",
  },
  {
    id: "BTCUSD",
    displaySymbol: "BTC/USD",
    shortCode: "BTC",
    name: "Bitcoin spot",
    assetClass: "crypto",
    base: "BTC",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  {
    id: "ETHUSD",
    displaySymbol: "ETH/USD",
    shortCode: "ETH",
    name: "Ether spot",
    assetClass: "crypto",
    base: "ETH",
    quote: "USD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  {
    id: "BTC",
    displaySymbol: "BTC",
    name: "Bitcoin",
    assetClass: "crypto",
  },
  {
    id: "ETH",
    displaySymbol: "ETH",
    name: "Ether",
    assetClass: "crypto",
  },
  {
    id: "CHN50",
    displaySymbol: "CHN50",
    name: "China A50 Index",
    assetClass: "indices",
  },
  {
    id: "AUS200",
    displaySymbol: "AUS200",
    name: "Australia 200 Index",
    assetClass: "indices",
  },
  {
    id: "UK100",
    displaySymbol: "UK100",
    name: "FTSE 100 Index",
    assetClass: "indices",
  },
  {
    id: "FRA40",
    displaySymbol: "FRA40",
    name: "France 40 Index",
    assetClass: "indices",
  },
  {
    id: "EUSTX50",
    displaySymbol: "EUSTX50",
    name: "Euro Stoxx 50",
    assetClass: "indices",
  },
  {
    id: "JPN225",
    displaySymbol: "JPN225",
    name: "Nikkei 225",
    assetClass: "indices",
  },
  {
    id: "HKG33",
    displaySymbol: "HKG33",
    name: "Hang Seng Index",
    assetClass: "indices",
  },
  {
    id: "ESP35",
    displaySymbol: "ESP35",
    name: "Spain 35 Index",
    assetClass: "indices",
  },
  {
    id: "US30",
    displaySymbol: "US30",
    name: "Dow Jones 30",
    assetClass: "indices",
  },
  {
    id: "GER30",
    displaySymbol: "GER30",
    name: "DAX 30",
    assetClass: "indices",
  },
  {
    id: "NAS100",
    displaySymbol: "NAS100",
    name: "Nasdaq 100",
    assetClass: "indices",
  },
  {
    id: "SPX500",
    displaySymbol: "SPX500",
    name: "S&P 500",
    assetClass: "indices",
  },
  {
    id: "US2000",
    displaySymbol: "US2000",
    name: "Russell 2000",
    assetClass: "indices",
  },
  {
    id: "AAPL",
    displaySymbol: "AAPL",
    name: "Apple Inc.",
    assetClass: "stocks",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "MSFT",
    displaySymbol: "MSFT",
    name: "Microsoft Corp.",
    assetClass: "stocks",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "NVDA",
    displaySymbol: "NVDA",
    name: "NVIDIA Corp.",
    assetClass: "stocks",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "AMZN",
    displaySymbol: "AMZN",
    name: "Amazon.com Inc.",
    assetClass: "stocks",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "TSLA",
    displaySymbol: "TSLA",
    name: "Tesla Inc.",
    assetClass: "stocks",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "META",
    displaySymbol: "META",
    name: "Meta Platforms Inc.",
    assetClass: "stocks",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "GOOGL",
    displaySymbol: "GOOGL",
    name: "Alphabet Inc. Class A",
    assetClass: "stocks",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  {
    id: "DXY",
    displaySymbol: "DXY",
    name: "US Dollar Index",
    assetClass: "indices",
    format: {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
];

const INSTRUMENT_MAP: Record<InstrumentId, InstrumentMetadata> = RAW_INSTRUMENTS
  .reduce(
    (accumulator, instrument) => {
      accumulator[instrument.id] = instrument;
      return accumulator;
    },
    {} as Record<InstrumentId, InstrumentMetadata>,
  );

export const PRIMARY_CURRENCY_CODES = [
  "JPY",
  "AUD",
  "EUR",
  "CHF",
  "CAD",
  "GBP",
  "USD",
  "NZD",
] as const satisfies readonly InstrumentId[];

export const DEFAULT_FX_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "AUDUSD",
  "NZDUSD",
  "USDCAD",
  "USDCHF",
  "USDJPY",
  "EURGBP",
  "EURAUD",
  "EURNZD",
  "GBPAUD",
  "AUDNZD",
  "EURJPY",
  "GBPJPY",
  "AUDJPY",
  "NZDJPY",
  "CADJPY",
  "CHFJPY",
  "EURCHF",
  "GBPCHF",
] as const satisfies readonly InstrumentId[];

export function listInstruments(assetClass: AssetClass): InstrumentMetadata[] {
  return RAW_INSTRUMENTS.filter((instrument) =>
    instrument.assetClass === assetClass
  );
}

export function findInstrumentMetadata(
  id: string,
): InstrumentMetadata | undefined {
  return INSTRUMENT_MAP[id as InstrumentId];
}

export function getInstrumentMetadata(id: string): InstrumentMetadata {
  const metadata = findInstrumentMetadata(id);
  if (!metadata) {
    throw new Error(`Instrument metadata not found for id: ${id}`);
  }
  return metadata;
}

export function formatInstrumentLabel(
  id: string,
  options?: { variant?: "short" | "display" | "name" },
): string {
  const metadata = findInstrumentMetadata(id);
  if (!metadata) {
    return id;
  }
  if (options?.variant === "name") {
    return metadata.name;
  }
  if (options?.variant === "short" && metadata.shortCode) {
    return metadata.shortCode;
  }
  if (options?.variant === "display") {
    return metadata.displaySymbol;
  }
  return metadata.shortCode ?? metadata.displaySymbol ?? metadata.id;
}

export type TagVisual = {
  label: string;
  icon?: string;
  background?: Colors;
};
