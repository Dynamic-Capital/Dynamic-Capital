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
  {
    id: "US500",
    displaySymbol: "US500",
    name: "S&P 500 Index",
    assetClass: "indices",
  },
  {
    id: "US100",
    displaySymbol: "US100",
    name: "Nasdaq 100 Index",
    assetClass: "indices",
  },
  {
    id: "USND",
    displaySymbol: "USND",
    name: "Nasdaq Composite Index",
    assetClass: "indices",
  },
  {
    id: "US400",
    displaySymbol: "US400",
    name: "S&P MidCap 400 Index",
    assetClass: "indices",
  },
  {
    id: "USVIX",
    displaySymbol: "USVIX",
    name: "CBOE Volatility Index",
    assetClass: "indices",
  },
  {
    id: "JP225",
    displaySymbol: "JP225",
    name: "Nikkei 225 Index",
    assetClass: "indices",
  },
  {
    id: "GB100",
    displaySymbol: "GB100",
    name: "FTSE 100 Index",
    assetClass: "indices",
  },
  {
    id: "ECUADORGENERAL",
    displaySymbol: "ECUADORGENERAL",
    name: "Ecuador General Index",
    assetClass: "indices",
  },
  {
    id: "DE40",
    displaySymbol: "DE40",
    name: "DAX 40 Index",
    assetClass: "indices",
  },
  {
    id: "FR40",
    displaySymbol: "FR40",
    name: "France 40 Index",
    assetClass: "indices",
  },
  {
    id: "IT40",
    displaySymbol: "IT40",
    name: "Italy 40 Index",
    assetClass: "indices",
  },
  {
    id: "ES35",
    displaySymbol: "ES35",
    name: "Spain 35 Index",
    assetClass: "indices",
  },
  {
    id: "AUSALLORD",
    displaySymbol: "AUSALLORD",
    name: "All Ordinaries Index",
    assetClass: "indices",
  },
  {
    id: "ASX200",
    displaySymbol: "ASX200",
    name: "S&P/ASX 200 Index",
    assetClass: "indices",
  },
  {
    id: "AU50",
    displaySymbol: "AU50",
    name: "S&P/ASX 50 Index",
    assetClass: "indices",
  },
  {
    id: "EUROSTOXXVOL",
    displaySymbol: "EUROSTOXXVOL",
    name: "Euro Stoxx Volatility Index",
    assetClass: "indices",
  },
  {
    id: "SHANGHAI50",
    displaySymbol: "SHANGHAI50",
    name: "Shanghai 50 Index",
    assetClass: "indices",
  },
  {
    id: "SHANGHAI",
    displaySymbol: "SHANGHAI",
    name: "Shanghai Composite Index",
    assetClass: "indices",
  },
  {
    id: "CSI300",
    displaySymbol: "CSI300",
    name: "CSI 300 Index",
    assetClass: "indices",
  },
  {
    id: "CH50",
    displaySymbol: "CH50",
    name: "China 50 Index",
    assetClass: "indices",
  },
  {
    id: "SENSEX",
    displaySymbol: "SENSEX",
    name: "BSE Sensex Index",
    assetClass: "indices",
  },
  {
    id: "TSX",
    displaySymbol: "TSX",
    name: "S&P/TSX Composite Index",
    assetClass: "indices",
  },
  {
    id: "MOEX",
    displaySymbol: "MOEX",
    name: "MOEX Russia Index",
    assetClass: "indices",
  },
  {
    id: "DSEBROAD",
    displaySymbol: "DSEBROAD",
    name: "DSE Broad Index",
    assetClass: "indices",
  },
  {
    id: "IBOVESPA",
    displaySymbol: "IBOVESPA",
    name: "Ibovespa Index",
    assetClass: "indices",
  },
  {
    id: "IPC",
    displaySymbol: "IPC",
    name: "IPC Mexico Index",
    assetClass: "indices",
  },
  {
    id: "PERUGENERAL",
    displaySymbol: "PERUGENERAL",
    name: "Peru General Index",
    assetClass: "indices",
  },
  {
    id: "JCI",
    displaySymbol: "JCI",
    name: "Jakarta Composite Index",
    assetClass: "indices",
  },
  {
    id: "NL25",
    displaySymbol: "NL25",
    name: "AEX Index",
    assetClass: "indices",
  },
  {
    id: "BIST100",
    displaySymbol: "BIST100",
    name: "BIST 100 Index",
    assetClass: "indices",
  },
  {
    id: "TASI",
    displaySymbol: "TASI",
    name: "Tadawul All Share Index",
    assetClass: "indices",
  },
  {
    id: "CH20",
    displaySymbol: "CH20",
    name: "Switzerland 20 Index",
    assetClass: "indices",
  },
  {
    id: "STOCKHOLM",
    displaySymbol: "STOCKHOLM",
    name: "OMX Stockholm All Share Index",
    assetClass: "indices",
  },
  {
    id: "NSEALLSHARE",
    displaySymbol: "NSEALLSHARE",
    name: "NSE All Share Index",
    assetClass: "indices",
  },
  {
    id: "WIG",
    displaySymbol: "WIG",
    name: "Warsaw Stock Exchange WIG Index",
    assetClass: "indices",
  },
  {
    id: "MERVAL",
    displaySymbol: "MERVAL",
    name: "MERVAL Index",
    assetClass: "indices",
  },
  {
    id: "BE20",
    displaySymbol: "BE20",
    name: "BEL 20 Index",
    assetClass: "indices",
  },
  {
    id: "IBC",
    displaySymbol: "IBC",
    name: "IBC Caracas Index",
    assetClass: "indices",
  },
  {
    id: "OSLO",
    displaySymbol: "OSLO",
    name: "Oslo Bors All Share Index",
    assetClass: "indices",
  },
  {
    id: "TAIEX",
    displaySymbol: "TAIEX",
    name: "Taiwan Stock Market Index",
    assetClass: "indices",
  },
  {
    id: "ATX",
    displaySymbol: "ATX",
    name: "Austrian Traded Index",
    assetClass: "indices",
  },
  {
    id: "ADXGENERAL",
    displaySymbol: "ADXGENERAL",
    name: "ADX General Index",
    assetClass: "indices",
  },
  {
    id: "COLCAP",
    displaySymbol: "COLCAP",
    name: "COLCAP Index",
    assetClass: "indices",
  },
  {
    id: "SET50",
    displaySymbol: "SET50",
    name: "SET 50 Index",
    assetClass: "indices",
  },
  {
    id: "SA40",
    displaySymbol: "SA40",
    name: "South Africa Top 40 Index",
    assetClass: "indices",
  },
  {
    id: "SAALL",
    displaySymbol: "SAALL",
    name: "South Africa All Share Index",
    assetClass: "indices",
  },
  {
    id: "COPENHAGEN",
    displaySymbol: "COPENHAGEN",
    name: "OMX Copenhagen 20 Index",
    assetClass: "indices",
  },
  {
    id: "FKLCI",
    displaySymbol: "FKLCI",
    name: "FTSE Bursa Malaysia KLCI Index",
    assetClass: "indices",
  },
  {
    id: "STI",
    displaySymbol: "STI",
    name: "Straits Times Index",
    assetClass: "indices",
  },
  {
    id: "TA125",
    displaySymbol: "TA125",
    name: "TA-125 Index",
    assetClass: "indices",
  },
  {
    id: "HK50",
    displaySymbol: "HK50",
    name: "Hang Seng Index",
    assetClass: "indices",
  },
  {
    id: "EGX30",
    displaySymbol: "EGX30",
    name: "EGX 30 Index",
    assetClass: "indices",
  },
  {
    id: "PSEI",
    displaySymbol: "PSEI",
    name: "Philippine Stock Exchange Index",
    assetClass: "indices",
  },
  {
    id: "HELSINKI",
    displaySymbol: "HELSINKI",
    name: "OMX Helsinki All Share Index",
    assetClass: "indices",
  },
  {
    id: "HELSINKI25",
    displaySymbol: "HELSINKI25",
    name: "OMX Helsinki 25 Index",
    assetClass: "indices",
  },
  {
    id: "IGPA",
    displaySymbol: "IGPA",
    name: "IGPA Index",
    assetClass: "indices",
  },
  {
    id: "KSE100",
    displaySymbol: "KSE100",
    name: "KSE 100 Index",
    assetClass: "indices",
  },
  {
    id: "ISEQ",
    displaySymbol: "ISEQ",
    name: "ISEQ Overall Index",
    assetClass: "indices",
  },
  {
    id: "ATHENSGENERAL",
    displaySymbol: "ATHENSGENERAL",
    name: "Athens General Index",
    assetClass: "indices",
  },
  {
    id: "PSIGERAL",
    displaySymbol: "PSIGERAL",
    name: "PSI Geral Index",
    assetClass: "indices",
  },
  {
    id: "PSI",
    displaySymbol: "PSI",
    name: "PSI Index",
    assetClass: "indices",
  },
  {
    id: "KASE",
    displaySymbol: "KASE",
    name: "KASE Index",
    assetClass: "indices",
  },
  {
    id: "QE",
    displaySymbol: "QE",
    name: "Qatar Exchange Index",
    assetClass: "indices",
  },
  {
    id: "PX",
    displaySymbol: "PX",
    name: "PX Index",
    assetClass: "indices",
  },
  {
    id: "BET",
    displaySymbol: "BET",
    name: "BET Index",
    assetClass: "indices",
  },
  {
    id: "NZX50",
    displaySymbol: "NZX50",
    name: "NZX 50 Index",
    assetClass: "indices",
  },
  {
    id: "HNX",
    displaySymbol: "HNX",
    name: "HNX Index",
    assetClass: "indices",
  },
  {
    id: "VN",
    displaySymbol: "VN",
    name: "VN Index",
    assetClass: "indices",
  },
  {
    id: "BUX",
    displaySymbol: "BUX",
    name: "BUX Index",
    assetClass: "indices",
  },
  {
    id: "PFTS",
    displaySymbol: "PFTS",
    name: "PFTS Index",
    assetClass: "indices",
  },
  {
    id: "CFG25",
    displaySymbol: "CFG25",
    name: "CFG 25 Index",
    assetClass: "indices",
  },
  {
    id: "SAX",
    displaySymbol: "SAX",
    name: "SAX Index",
    assetClass: "indices",
  },
  {
    id: "MSM30",
    displaySymbol: "MSM30",
    name: "MSM 30 Index",
    assetClass: "indices",
  },
  {
    id: "ASPI",
    displaySymbol: "ASPI",
    name: "All Share Price Index",
    assetClass: "indices",
  },
  {
    id: "NAIROBI20",
    displaySymbol: "NAIROBI20",
    name: "Nairobi 20 Share Index",
    assetClass: "indices",
  },
  {
    id: "NAIROBIALL",
    displaySymbol: "NAIROBIALL",
    name: "Nairobi All Share Index",
    assetClass: "indices",
  },
  {
    id: "LUXX",
    displaySymbol: "LUXX",
    name: "LuxX Index",
    assetClass: "indices",
  },
  {
    id: "CROBEX",
    displaySymbol: "CROBEX",
    name: "CROBEX Index",
    assetClass: "indices",
  },
  {
    id: "SOFIX",
    displaySymbol: "SOFIX",
    name: "SOFIX Index",
    assetClass: "indices",
  },
  {
    id: "SBITOP",
    displaySymbol: "SBITOP",
    name: "SBITOP Index",
    assetClass: "indices",
  },
  {
    id: "DSEI",
    displaySymbol: "DSEI",
    name: "DSEI Index",
    assetClass: "indices",
  },
  {
    id: "VILNIUS",
    displaySymbol: "VILNIUS",
    name: "OMX Vilnius Index",
    assetClass: "indices",
  },
  {
    id: "TUNINDEX",
    displaySymbol: "TUNINDEX",
    name: "Tunindex",
    assetClass: "indices",
  },
  {
    id: "BVPSI",
    displaySymbol: "BVPSI",
    name: "BVPSI Index",
    assetClass: "indices",
  },
  {
    id: "BLOM",
    displaySymbol: "BLOM",
    name: "BLOM Stock Index",
    assetClass: "indices",
  },
  {
    id: "BELEX15",
    displaySymbol: "BELEX15",
    name: "BELEX 15 Index",
    assetClass: "indices",
  },
  {
    id: "GGSECI",
    displaySymbol: "GGSECI",
    name: "GGSECI Index",
    assetClass: "indices",
  },
  {
    id: "ASE",
    displaySymbol: "ASE",
    name: "ASE Index",
    assetClass: "indices",
  },
  {
    id: "EU600",
    displaySymbol: "EU600",
    name: "STOXX Europe 600 Index",
    assetClass: "indices",
  },
  {
    id: "EU100",
    displaySymbol: "EU100",
    name: "STOXX Europe 100 Index",
    assetClass: "indices",
  },
  {
    id: "EU50",
    displaySymbol: "EU50",
    name: "Euro Stoxx 50 Index",
    assetClass: "indices",
  },
  {
    id: "EU350",
    displaySymbol: "EU350",
    name: "STOXX Europe 350 Index",
    assetClass: "indices",
  },
  {
    id: "GLOBALEQUITY",
    displaySymbol: "GLOBALEQUITY",
    name: "Global Equity Index",
    assetClass: "indices",
  },
  {
    id: "SEMDEX",
    displaySymbol: "SEMDEX",
    name: "SEMDEX Index",
    assetClass: "indices",
  },
  {
    id: "RIGA",
    displaySymbol: "RIGA",
    name: "OMX Riga Index",
    assetClass: "indices",
  },
  {
    id: "SASX10",
    displaySymbol: "SASX10",
    name: "SASX 10 Index",
    assetClass: "indices",
  },
  {
    id: "TALLINN",
    displaySymbol: "TALLINN",
    name: "OMX Tallinn Index",
    assetClass: "indices",
  },
  {
    id: "USEALL",
    displaySymbol: "USEALL",
    name: "USE All Share Index",
    assetClass: "indices",
  },
  {
    id: "MSE20",
    displaySymbol: "MSE20",
    name: "MSE 20 Index",
    assetClass: "indices",
  },
  {
    id: "LSXCOMPOSITE",
    displaySymbol: "LSXCOMPOSITE",
    name: "LSX Composite Index",
    assetClass: "indices",
  },
  {
    id: "MSEINDEX",
    displaySymbol: "MSEINDEX",
    name: "MSE Index",
    assetClass: "indices",
  },
  {
    id: "MBI10",
    displaySymbol: "MBI10",
    name: "MBI 10 Index",
    assetClass: "indices",
  },
  {
    id: "JSE",
    displaySymbol: "JSE",
    name: "JSE All Share Index",
    assetClass: "indices",
  },
  {
    id: "ICEX",
    displaySymbol: "ICEX",
    name: "OMX Iceland All Share Index",
    assetClass: "indices",
  },
  {
    id: "BSX",
    displaySymbol: "BSX",
    name: "Bermuda Stock Exchange Index",
    assetClass: "indices",
  },
  {
    id: "GABORONE",
    displaySymbol: "GABORONE",
    name: "Botswana Gaborone Index",
    assetClass: "indices",
  },
  {
    id: "CSEGENERAL",
    displaySymbol: "CSEGENERAL",
    name: "CSE General Index",
    assetClass: "indices",
  },
  {
    id: "DFMGENERAL",
    displaySymbol: "DFMGENERAL",
    name: "DFM General Index",
    assetClass: "indices",
  },
  {
    id: "NSXOVERALL",
    displaySymbol: "NSXOVERALL",
    name: "NSX Overall Index",
    assetClass: "indices",
  },
  {
    id: "BCTCORP",
    displaySymbol: "BCTCORP",
    name: "BCT Corp Index",
    assetClass: "indices",
  },
  {
    id: "KUWAITALL",
    displaySymbol: "KUWAITALL",
    name: "Kuwait All Share Index",
    assetClass: "indices",
  },
  {
    id: "USBANK",
    displaySymbol: "USBANK",
    name: "US Bank Index",
    assetClass: "indices",
  },
  {
    id: "ZSIINDUSTRIALS",
    displaySymbol: "ZSIINDUSTRIALS",
    name: "ZSI Industrials Index",
    assetClass: "indices",
  },
  {
    id: "DEMID",
    displaySymbol: "DEMID",
    name: "DAX Mid Cap Index",
    assetClass: "indices",
  },
  {
    id: "MONEX",
    displaySymbol: "MONEX",
    name: "Monex Index",
    assetClass: "indices",
  },
  {
    id: "JPVIX",
    displaySymbol: "JPVIX",
    name: "Nikkei Volatility Index",
    assetClass: "indices",
  },
  {
    id: "US5000",
    displaySymbol: "US5000",
    name: "Wilshire 5000 Index",
    assetClass: "indices",
  },
  {
    id: "TEDPIX",
    displaySymbol: "TEDPIX",
    name: "TEDPIX Index",
    assetClass: "indices",
  },
  {
    id: "US1000",
    displaySymbol: "US1000",
    name: "Russell 1000 Index",
    assetClass: "indices",
  },
  {
    id: "NIFTY50",
    displaySymbol: "NIFTY50",
    name: "NIFTY 50 Index",
    assetClass: "indices",
  },
  {
    id: "EUSTOXXBANKS",
    displaySymbol: "EUSTOXXBANKS",
    name: "Euro Stoxx Banks Index",
    assetClass: "indices",
  },
  {
    id: "DESMALL",
    displaySymbol: "DESMALL",
    name: "DAX Small Cap Index",
    assetClass: "indices",
  },
  {
    id: "ESTIRAD",
    displaySymbol: "ESTIRAD",
    name: "Estirad Index",
    assetClass: "indices",
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

export const INDEX_FEED_TYPES = [
  "Live Stream",
  "Delayed Intraday",
  "Historical Daily",
] as const;

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
