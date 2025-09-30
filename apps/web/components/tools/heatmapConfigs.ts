import type { AssetClass, InstrumentId, TagVisual } from "@/data/instruments";

export type HeatmapAssetClass = AssetClass;

export type HeatmapSentiment = "Bullish" | "Bearish" | "Neutral";

export type HeatmapTrendDirection = "Bullish" | "Bearish" | "Balancing";

export type HeatmapMomentumClassification =
  | "Very Bullish"
  | "Bullish"
  | "Bearish"
  | "Very Bearish";

export interface HeatmapStrengthEntryConfig {
  instrumentId: InstrumentId;
  score: number;
  dayChange: string;
  sentiment: HeatmapSentiment;
}

export interface HeatmapSeriesConfig {
  instrumentId: InstrumentId;
  values: number[];
  label?: string;
}

export interface HeatmapMatrixPointConfig {
  instrumentId: InstrumentId;
  label?: string;
  shortTerm: number;
  longTerm: number;
  conviction: number;
  direction: HeatmapTrendDirection;
}

export interface HeatmapMomentumEntryConfig {
  instrumentId: InstrumentId;
  score: number;
  classification?: HeatmapMomentumClassification;
  display?: string;
}

interface SectionCopy {
  title: string;
  description: string;
  asOf: string;
}

interface MarketMoversCopy {
  title: string;
  description: string;
}

export interface HeatmapConfig {
  assetClass: HeatmapAssetClass;
  snapshotLabel: string;
  hero: {
    title: string;
    description: string;
  };
  strength: {
    copy: SectionCopy;
    entries: HeatmapStrengthEntryConfig[];
  };
  chart: {
    copy: SectionCopy;
    labels: string[];
    series: HeatmapSeriesConfig[];
  };
  matrix: {
    copy: SectionCopy;
    tags: TagVisual[];
    points: HeatmapMatrixPointConfig[];
  };
  marketMovers: {
    copy: MarketMoversCopy;
    defaultEntries: HeatmapMomentumEntryConfig[];
  };
}

const DEFAULT_TAGS: TagVisual[] = [
  { label: "20 SMA", icon: "trending-up", background: "neutral-alpha-weak" },
  { label: "5 SMA", icon: "trending-up", background: "neutral-alpha-weak" },
  { label: "Replay", icon: "play", background: "brand-alpha-weak" },
];

const SHARED_MARKET_MOVERS_COPY: MarketMoversCopy = {
  title: "Market Movers",
  description:
    "Multi-asset momentum board covering currencies, crypto, and global indices to spotlight leadership shifts.",
};

const SHARED_MARKET_MOVERS_DEFAULT: HeatmapMomentumEntryConfig[] = [
  { instrumentId: "Copper", score: 78 },
  { instrumentId: "CORNF", score: 46 },
  { instrumentId: "NGAS", score: 58 },
  { instrumentId: "SOYF", score: 67 },
  { instrumentId: "UKOil", score: 73 },
  { instrumentId: "USOil", score: 71 },
  { instrumentId: "WHEATF", score: 38 },
  { instrumentId: "XAGUSD", score: 55 },
  { instrumentId: "XAUUSD", score: 84 },
  { instrumentId: "USD", score: 62 },
  { instrumentId: "BTC", score: 74 },
  { instrumentId: "ETH", score: 68 },
  { instrumentId: "CHN50", score: 54 },
  { instrumentId: "AUS200", score: 57 },
  { instrumentId: "UK100", score: 52 },
  { instrumentId: "FRA40", score: 51 },
  { instrumentId: "EUSTX50", score: 50 },
  { instrumentId: "JPN225", score: 59 },
  { instrumentId: "HKG33", score: 45 },
  { instrumentId: "ESP35", score: 53 },
  { instrumentId: "US30", score: 61 },
  { instrumentId: "GER30", score: 58 },
  { instrumentId: "NAS100", score: 65 },
  { instrumentId: "SPX500", score: 63 },
  { instrumentId: "US2000", score: 49 },
];

export const HEATMAP_CONFIGS: Record<HeatmapAssetClass, HeatmapConfig> = {
  commodities: {
    assetClass: "commodities",
    snapshotLabel: "Commodities market snapshot",
    hero: {
      title: "Market snapshot",
      description:
        "A consolidated read on the desk's commodity coverage – from contract momentum to cross-complex leadership – so you can calibrate exposure in seconds.",
    },
    strength: {
      copy: {
        title: "Commodities Strength",
        description:
          "Quick view of contract-level momentum, sentiment, and intraday bias to anchor your commodity playbook.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      entries: [
        {
          instrumentId: "XAGUSD",
          score: 47,
          dayChange: "-0.5%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "NGAS",
          score: 58,
          dayChange: "+2.3%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "WHEATF",
          score: 39,
          dayChange: "-1.2%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "UKOil",
          score: 63,
          dayChange: "+1.1%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "USOil",
          score: 66,
          dayChange: "+0.8%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "SOYF",
          score: 68,
          dayChange: "+1.4%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "XAUUSD",
          score: 81,
          dayChange: "+0.7%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "CORNF",
          score: 52,
          dayChange: "+0.6%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "Copper",
          score: 76,
          dayChange: "+0.9%",
          sentiment: "Bullish",
        },
      ],
    },
    chart: {
      copy: {
        title: "Commodities Heat Map",
        description:
          "Relative momentum readings over the last month highlight which contracts are heating up or losing steam.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      labels: ["Aug 29", "Sep 4", "Sep 10", "Sep 16", "Sep 23"],
      series: [
        { instrumentId: "Copper", values: [48, 56, 62, 70, 78] },
        { instrumentId: "CORNF", values: [34, 42, 47, 52, 58] },
        { instrumentId: "NGAS", values: [32, 36, 41, 44, 49] },
        { instrumentId: "SOYF", values: [46, 52, 58, 63, 68] },
        { instrumentId: "UKOil", values: [44, 49, 54, 59, 64] },
        { instrumentId: "USOil", values: [42, 47, 53, 58, 63] },
        { instrumentId: "WHEATF", values: [30, 34, 36, 38, 41] },
        { instrumentId: "XAGUSD", values: [45, 48, 46, 49, 53] },
        { instrumentId: "XAUUSD", values: [58, 62, 66, 72, 78] },
      ],
    },
    matrix: {
      copy: {
        title: "Commodities Volatility",
        description:
          "Short- versus long-term trend posture shows where volatility is compressing or expanding across the complex.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      tags: DEFAULT_TAGS,
      points: [
        {
          instrumentId: "XAUUSD",
          label: "Gold",
          shortTerm: 74,
          longTerm: 78,
          conviction: 86,
          direction: "Bullish",
        },
        {
          instrumentId: "XAGUSD",
          label: "Silver",
          shortTerm: 52,
          longTerm: 58,
          conviction: 64,
          direction: "Balancing",
        },
        {
          instrumentId: "Copper",
          label: "Copper",
          shortTerm: 68,
          longTerm: 72,
          conviction: 81,
          direction: "Bullish",
        },
        {
          instrumentId: "NGAS",
          label: "Nat gas",
          shortTerm: 46,
          longTerm: 42,
          conviction: 58,
          direction: "Bearish",
        },
        {
          instrumentId: "SOYF",
          label: "Soybeans",
          shortTerm: 60,
          longTerm: 56,
          conviction: 63,
          direction: "Bullish",
        },
        {
          instrumentId: "UKOil",
          label: "UKOil",
          shortTerm: 64,
          longTerm: 66,
          conviction: 72,
          direction: "Bullish",
        },
        {
          instrumentId: "USOil",
          label: "USOil",
          shortTerm: 58,
          longTerm: 61,
          conviction: 68,
          direction: "Bullish",
        },
        {
          instrumentId: "CORNF",
          label: "Corn",
          shortTerm: 44,
          longTerm: 48,
          conviction: 52,
          direction: "Bearish",
        },
        {
          instrumentId: "WHEATF",
          label: "Wheat",
          shortTerm: 36,
          longTerm: 40,
          conviction: 45,
          direction: "Bearish",
        },
      ],
    },
    marketMovers: {
      copy: SHARED_MARKET_MOVERS_COPY,
      defaultEntries: SHARED_MARKET_MOVERS_DEFAULT,
    },
  },
  currencies: {
    assetClass: "currencies",
    snapshotLabel: "Currency market snapshot",
    hero: {
      title: "FX market snapshot",
      description:
        "Live posture on the major pairs and rate-sensitive crosses so currency desks can respond before liquidity shifts.",
    },
    strength: {
      copy: {
        title: "FX Momentum Board",
        description:
          "Ranks the majors by intraday score with sentiment context to keep playbooks aligned with flows.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      entries: [
        {
          instrumentId: "EURUSD",
          score: 62,
          dayChange: "+0.4%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "GBPUSD",
          score: 54,
          dayChange: "-0.2%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "USDJPY",
          score: 45,
          dayChange: "-0.6%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "USDCAD",
          score: 57,
          dayChange: "+0.3%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "USDCHF",
          score: 49,
          dayChange: "-0.1%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "AUDUSD",
          score: 41,
          dayChange: "-0.8%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "NZDUSD",
          score: 39,
          dayChange: "-0.7%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "EURGBP",
          score: 58,
          dayChange: "+0.2%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "USDSEK",
          score: 66,
          dayChange: "+0.9%",
          sentiment: "Bullish",
        },
      ],
    },
    chart: {
      copy: {
        title: "FX Relative Strength",
        description:
          "Tracks weekly performance spreads to reveal which pairs are leading or lagging the majors.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      labels: ["Aug 29", "Sep 4", "Sep 10", "Sep 16", "Sep 23"],
      series: [
        { instrumentId: "EURUSD", values: [52, 55, 57, 60, 63] },
        { instrumentId: "GBPUSD", values: [48, 51, 53, 52, 50] },
        { instrumentId: "USDJPY", values: [44, 42, 41, 39, 36] },
        { instrumentId: "USDCAD", values: [46, 48, 50, 52, 55] },
        { instrumentId: "USDCHF", values: [40, 42, 45, 48, 50] },
        { instrumentId: "AUDUSD", values: [38, 36, 34, 33, 32] },
        { instrumentId: "NZDUSD", values: [36, 35, 33, 32, 31] },
        { instrumentId: "EURGBP", values: [50, 52, 55, 57, 59] },
        { instrumentId: "USDSEK", values: [58, 60, 62, 64, 66] },
      ],
    },
    matrix: {
      copy: {
        title: "FX Volatility Grid",
        description:
          "Overlay short- and medium-term scores to pinpoint the crosses with the cleanest directional edge.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      tags: DEFAULT_TAGS,
      points: [
        {
          instrumentId: "EURUSD",
          label: "EUR/USD",
          shortTerm: 68,
          longTerm: 72,
          conviction: 74,
          direction: "Bullish",
        },
        {
          instrumentId: "GBPUSD",
          label: "GBP/USD",
          shortTerm: 52,
          longTerm: 49,
          conviction: 58,
          direction: "Balancing",
        },
        {
          instrumentId: "USDJPY",
          label: "USD/JPY",
          shortTerm: 34,
          longTerm: 42,
          conviction: 45,
          direction: "Bearish",
        },
        {
          instrumentId: "USDCAD",
          label: "USD/CAD",
          shortTerm: 58,
          longTerm: 56,
          conviction: 60,
          direction: "Bullish",
        },
        {
          instrumentId: "USDCHF",
          label: "USD/CHF",
          shortTerm: 46,
          longTerm: 48,
          conviction: 52,
          direction: "Balancing",
        },
        {
          instrumentId: "AUDUSD",
          label: "AUD/USD",
          shortTerm: 42,
          longTerm: 44,
          conviction: 47,
          direction: "Bearish",
        },
        {
          instrumentId: "NZDUSD",
          label: "NZD/USD",
          shortTerm: 38,
          longTerm: 40,
          conviction: 43,
          direction: "Bearish",
        },
        {
          instrumentId: "EURGBP",
          label: "EUR/GBP",
          shortTerm: 61,
          longTerm: 63,
          conviction: 65,
          direction: "Bullish",
        },
        {
          instrumentId: "USDSEK",
          label: "USD/SEK",
          shortTerm: 70,
          longTerm: 68,
          conviction: 72,
          direction: "Bullish",
        },
      ],
    },
    marketMovers: {
      copy: SHARED_MARKET_MOVERS_COPY,
      defaultEntries: SHARED_MARKET_MOVERS_DEFAULT,
    },
  },
  indices: {
    assetClass: "indices",
    snapshotLabel: "Equity index snapshot",
    hero: {
      title: "Index market snapshot",
      description:
        "Regional equity leadership, volatility posture, and conviction scoring to orient risk-on versus defensives in minutes.",
    },
    strength: {
      copy: {
        title: "Global Index Strength",
        description:
          "Highlights the strongest cash indices with sentiment cues for hedging and rotation decisions.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      entries: [
        {
          instrumentId: "NAS100",
          score: 72,
          dayChange: "+0.6%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "SPX500",
          score: 68,
          dayChange: "+0.5%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "US30",
          score: 63,
          dayChange: "+0.3%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "GER30",
          score: 57,
          dayChange: "+0.2%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "EUSTX50",
          score: 55,
          dayChange: "+0.1%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "AUS200",
          score: 52,
          dayChange: "-0.1%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "HKG33",
          score: 44,
          dayChange: "-0.7%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "CHN50",
          score: 41,
          dayChange: "-0.9%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "US2000",
          score: 48,
          dayChange: "-0.3%",
          sentiment: "Neutral",
        },
      ],
    },
    chart: {
      copy: {
        title: "Index Relative Strength",
        description:
          "Momentum curves across global benchmarks to spot leadership rotations before the cash open.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      labels: ["Aug 29", "Sep 4", "Sep 10", "Sep 16", "Sep 23"],
      series: [
        { instrumentId: "NAS100", values: [60, 62, 65, 69, 72] },
        { instrumentId: "SPX500", values: [55, 57, 59, 62, 65] },
        { instrumentId: "US30", values: [52, 53, 55, 58, 61] },
        { instrumentId: "GER30", values: [48, 49, 50, 53, 55] },
        { instrumentId: "EUSTX50", values: [46, 47, 48, 50, 52] },
        { instrumentId: "AUS200", values: [44, 45, 46, 48, 50] },
        { instrumentId: "HKG33", values: [40, 38, 37, 36, 35] },
        { instrumentId: "CHN50", values: [38, 37, 36, 35, 34] },
        { instrumentId: "US2000", values: [42, 43, 44, 46, 47] },
      ],
    },
    matrix: {
      copy: {
        title: "Index Volatility Map",
        description:
          "Short- versus long-term conviction helps position hedges and satellite trades across regions.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      tags: DEFAULT_TAGS,
      points: [
        {
          instrumentId: "NAS100",
          label: "Nasdaq",
          shortTerm: 72,
          longTerm: 74,
          conviction: 78,
          direction: "Bullish",
        },
        {
          instrumentId: "SPX500",
          label: "S&P 500",
          shortTerm: 66,
          longTerm: 68,
          conviction: 70,
          direction: "Bullish",
        },
        {
          instrumentId: "US30",
          label: "Dow",
          shortTerm: 58,
          longTerm: 60,
          conviction: 62,
          direction: "Bullish",
        },
        {
          instrumentId: "GER30",
          label: "DAX",
          shortTerm: 54,
          longTerm: 56,
          conviction: 58,
          direction: "Balancing",
        },
        {
          instrumentId: "EUSTX50",
          label: "EuroStoxx",
          shortTerm: 52,
          longTerm: 54,
          conviction: 55,
          direction: "Balancing",
        },
        {
          instrumentId: "AUS200",
          label: "ASX",
          shortTerm: 48,
          longTerm: 50,
          conviction: 52,
          direction: "Balancing",
        },
        {
          instrumentId: "HKG33",
          label: "Hang Seng",
          shortTerm: 36,
          longTerm: 38,
          conviction: 40,
          direction: "Bearish",
        },
        {
          instrumentId: "CHN50",
          label: "China A50",
          shortTerm: 34,
          longTerm: 36,
          conviction: 38,
          direction: "Bearish",
        },
        {
          instrumentId: "US2000",
          label: "Russell",
          shortTerm: 46,
          longTerm: 48,
          conviction: 50,
          direction: "Balancing",
        },
      ],
    },
    marketMovers: {
      copy: SHARED_MARKET_MOVERS_COPY,
      defaultEntries: SHARED_MARKET_MOVERS_DEFAULT,
    },
  },
  crypto: {
    assetClass: "crypto",
    snapshotLabel: "Crypto market snapshot",
    hero: {
      title: "Crypto market snapshot",
      description:
        "Momentum, volatility, and conviction readings across the majors to track digital asset leadership in real time.",
    },
    strength: {
      copy: {
        title: "Crypto Strength",
        description:
          "Scores the liquid tokens we trade most with sentiment context for when to press or fade momentum.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      entries: [
        {
          instrumentId: "BTCUSD",
          score: 78,
          dayChange: "+1.8%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "ETHUSD",
          score: 72,
          dayChange: "+1.2%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "XAUUSD",
          score: 64,
          dayChange: "-0.3%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "USD",
          score: 55,
          dayChange: "+0.1%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "NAS100",
          score: 50,
          dayChange: "-0.2%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "SPX500",
          score: 48,
          dayChange: "-0.4%",
          sentiment: "Bearish",
        },
        {
          instrumentId: "ETH",
          score: 68,
          dayChange: "+0.9%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "BTC",
          score: 74,
          dayChange: "+1.1%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "USDJPY",
          score: 42,
          dayChange: "-0.6%",
          sentiment: "Bearish",
        },
      ],
    },
    chart: {
      copy: {
        title: "Digital Asset Momentum",
        description:
          "Relative strength curves compare majors versus proxies to surface rotation in crypto risk appetite.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      labels: ["Aug 29", "Sep 4", "Sep 10", "Sep 16", "Sep 23"],
      series: [
        { instrumentId: "BTCUSD", values: [62, 65, 68, 72, 78] },
        { instrumentId: "ETHUSD", values: [58, 60, 63, 66, 72] },
        { instrumentId: "BTC", values: [60, 62, 64, 66, 70] },
        { instrumentId: "ETH", values: [55, 57, 59, 61, 65] },
        { instrumentId: "SPX500", values: [50, 51, 52, 53, 54] },
        { instrumentId: "NAS100", values: [52, 53, 54, 55, 56] },
        { instrumentId: "USD", values: [40, 42, 41, 40, 39] },
        { instrumentId: "XAUUSD", values: [46, 48, 47, 46, 45] },
        { instrumentId: "USDJPY", values: [44, 43, 42, 41, 40] },
      ],
    },
    matrix: {
      copy: {
        title: "Crypto Volatility Matrix",
        description:
          "Overlay structural conviction versus short-term heat to gauge how aggressively to size digital asset exposure.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      tags: DEFAULT_TAGS,
      points: [
        {
          instrumentId: "BTCUSD",
          label: "BTC/USD",
          shortTerm: 76,
          longTerm: 74,
          conviction: 80,
          direction: "Bullish",
        },
        {
          instrumentId: "ETHUSD",
          label: "ETH/USD",
          shortTerm: 70,
          longTerm: 68,
          conviction: 74,
          direction: "Bullish",
        },
        {
          instrumentId: "BTC",
          label: "BTC",
          shortTerm: 68,
          longTerm: 66,
          conviction: 72,
          direction: "Bullish",
        },
        {
          instrumentId: "ETH",
          label: "ETH",
          shortTerm: 64,
          longTerm: 62,
          conviction: 68,
          direction: "Bullish",
        },
        {
          instrumentId: "USD",
          label: "USD",
          shortTerm: 48,
          longTerm: 52,
          conviction: 50,
          direction: "Balancing",
        },
        {
          instrumentId: "NAS100",
          label: "Nasdaq",
          shortTerm: 54,
          longTerm: 56,
          conviction: 58,
          direction: "Balancing",
        },
        {
          instrumentId: "SPX500",
          label: "S&P 500",
          shortTerm: 50,
          longTerm: 52,
          conviction: 54,
          direction: "Balancing",
        },
        {
          instrumentId: "XAUUSD",
          label: "Gold",
          shortTerm: 46,
          longTerm: 48,
          conviction: 50,
          direction: "Balancing",
        },
        {
          instrumentId: "USDJPY",
          label: "USD/JPY",
          shortTerm: 42,
          longTerm: 40,
          conviction: 44,
          direction: "Bearish",
        },
      ],
    },
    marketMovers: {
      copy: SHARED_MARKET_MOVERS_COPY,
      defaultEntries: SHARED_MARKET_MOVERS_DEFAULT,
    },
  },
  stocks: {
    assetClass: "stocks",
    snapshotLabel: "Equities market snapshot",
    hero: {
      title: "Equities snapshot",
      description:
        "US megacaps and global leaders ranked by desk momentum so you can steer index and single-name exposure in sync with the playbook.",
    },
    strength: {
      copy: {
        title: "Equity Strength",
        description:
          "Momentum scoring for the equities roster currently driving risk-on flows.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      entries: [
        {
          instrumentId: "AAPL",
          score: 82,
          dayChange: "+1.4%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "MSFT",
          score: 76,
          dayChange: "+0.9%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "NVDA",
          score: 88,
          dayChange: "+2.1%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "AMZN",
          score: 69,
          dayChange: "+0.7%",
          sentiment: "Neutral",
        },
        {
          instrumentId: "META",
          score: 73,
          dayChange: "+1.1%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "GOOGL",
          score: 71,
          dayChange: "+0.8%",
          sentiment: "Bullish",
        },
        {
          instrumentId: "TSLA",
          score: 54,
          dayChange: "-1.8%",
          sentiment: "Bearish",
        },
      ],
    },
    chart: {
      copy: {
        title: "Equities Heat Map",
        description:
          "Relative strength over the past month highlights which megacaps continue to lead.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      labels: ["W-4", "W-3", "W-2", "W-1", "Now"],
      series: [
        { instrumentId: "AAPL", values: [48, 52, 58, 64, 72] },
        { instrumentId: "MSFT", values: [44, 47, 55, 60, 66] },
        { instrumentId: "NVDA", values: [62, 68, 74, 81, 88] },
      ],
    },
    matrix: {
      copy: {
        title: "Equities Momentum Matrix",
        description:
          "Short vs long-term momentum view that feeds the desk’s automation thresholds.",
        asOf: "As of 25 September 2025 at 06:29 GMT+5",
      },
      tags: DEFAULT_TAGS,
      points: [
        {
          instrumentId: "AAPL",
          label: "AAPL",
          shortTerm: 74,
          longTerm: 66,
          conviction: 82,
          direction: "Bullish",
        },
        {
          instrumentId: "MSFT",
          label: "MSFT",
          shortTerm: 62,
          longTerm: 58,
          conviction: 75,
          direction: "Balancing",
        },
        {
          instrumentId: "NVDA",
          label: "NVDA",
          shortTerm: 86,
          longTerm: 78,
          conviction: 88,
          direction: "Bullish",
        },
        {
          instrumentId: "TSLA",
          label: "TSLA",
          shortTerm: 48,
          longTerm: 52,
          conviction: 54,
          direction: "Bearish",
        },
      ],
    },
    marketMovers: {
      copy: {
        title: "Equity Movers",
        description:
          "Mega-cap momentum board aligning with the equities desk automation.",
      },
      defaultEntries: [
        { instrumentId: "AAPL", score: 82 },
        { instrumentId: "MSFT", score: 76 },
        { instrumentId: "NVDA", score: 88 },
        { instrumentId: "AMZN", score: 71 },
        { instrumentId: "META", score: 73 },
        { instrumentId: "GOOGL", score: 70 },
        { instrumentId: "TSLA", score: 54 },
      ],
    },
  },
};
