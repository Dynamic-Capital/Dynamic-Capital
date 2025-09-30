import type {
  SnapshotMomentumEntry,
  StaticMarketSnapshotConfig,
} from "./StaticMarketSnapshotSection";
import type {
  MoversSection,
  StrengthMeterEntry,
  VolatilityBucket,
  VolatilityMeterEntry,
} from "./MarketSnapshotPrimitives";

const formatSignedPercent = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const formatted = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${formatted}%`;
  }
  if (value < 0) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
};

const formatDecimal = (
  digits: number,
  { prefix }: { prefix?: string } = {},
) =>
(value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const formatted = value.toFixed(digits);
  return prefix ? `${prefix}${formatted}` : formatted;
};

const COMMODITY_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "XAUUSD",
    code: "XAU/USD",
    rank: 1,
    tone: "strong",
    summary:
      "Safe-haven flows keep gold elevated above the $2,400 hedge shelf with automation scaling on retests.",
  },
  {
    id: "UKOil",
    code: "Brent",
    rank: 2,
    tone: "balanced",
    summary:
      "Brent consolidates mid-range while OPEC rhetoric underpins bids – watching inventory data for direction.",
  },
  {
    id: "NGAS",
    code: "NatGas",
    rank: 3,
    tone: "soft",
    summary:
      "Weather swings leave natural gas choppy; automation throttles exposure until demand signals stabilise.",
  },
];

const COMMODITY_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "XAGUSD",
    code: "XAG/USD",
    rank: 1,
    summary:
      "Silver tracks gold but with wider realised ranges as macro hedgers express leverage here.",
  },
  {
    id: "NGAS",
    code: "NatGas",
    rank: 2,
    summary:
      "Temperature forecasts drive sharp intraday swings – size down and lean on automation.",
  },
  {
    id: "USOil",
    code: "WTI",
    rank: 3,
    summary:
      "WTI responding to US inventory surprises – expect spikes around EIA releases.",
  },
];

const COMMODITY_MOVERS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "XAUUSD",
        label: "Gold",
        symbol: "XAU/USD",
        changePercent: 0.74,
        change: 17.6,
        last: 2408.3,
      },
      {
        id: "UKOil",
        label: "Brent crude",
        symbol: "UKOIL",
        changePercent: 0.68,
        change: 0.58,
        last: 86.4,
      },
      {
        id: "SOYF",
        label: "Soybeans",
        symbol: "SOYF",
        changePercent: 0.54,
        change: 7.2,
        last: 1341.5,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "NGAS",
        label: "Natural gas",
        symbol: "NGAS",
        changePercent: -1.92,
        change: -0.05,
        last: 2.65,
      },
      {
        id: "XAGUSD",
        label: "Silver",
        symbol: "XAG/USD",
        changePercent: -0.84,
        change: -0.21,
        last: 24.8,
      },
      {
        id: "WHEATF",
        label: "Wheat",
        symbol: "WHEATF",
        changePercent: -0.65,
        change: -5.1,
        last: 776.2,
      },
    ],
  },
];

const COMMODITY_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "Energy",
    background: "brand-alpha-weak",
    data: [
      { id: "UKOil", label: "Brent", symbol: "UKOIL", value: 1.8 },
      { id: "USOil", label: "WTI", symbol: "USOIL", value: 1.6 },
      { id: "NGAS", label: "NatGas", symbol: "NGAS", value: 2.4 },
    ],
  },
  {
    title: "Metals",
    background: "neutral-alpha-weak",
    data: [
      { id: "XAUUSD", label: "Gold", symbol: "XAU/USD", value: 0.9 },
      { id: "XAGUSD", label: "Silver", symbol: "XAG/USD", value: 1.4 },
      { id: "Copper", label: "Copper", symbol: "Copper", value: 1.1 },
    ],
  },
];

const COMMODITY_MOMENTUM: SnapshotMomentumEntry[] = [
  {
    id: "XAUUSD",
    headline: "Gold bias remains constructive",
    detail:
      "Macro hedge demand keeps the metal bid while yields stabilise – maintain swing core above $2,380.",
  },
  {
    id: "USOil",
    headline: "WTI momentum cooling",
    detail:
      "Watching gasoline cracks for confirmation before fading the move back inside the range.",
  },
  {
    id: "SOYF",
    headline: "Soy complex firm",
    detail:
      "Weather premium still embedded – automation keeps trailing stops loose.",
  },
];

const COMMODITY_HEATMAP_NOTES = [
  "Energy dominates the upper quadrant while softs lag on harvest progress.",
  "Precious metals hold neutral momentum awaiting macro catalysts.",
  "Industrial metals steady as China stimulus headlines drip-feed optimism.",
];

export const COMMODITIES_SNAPSHOT_CONFIG: StaticMarketSnapshotConfig = {
  id: "commodities-market-snapshot",
  hero: {
    heading: "Commodities market snapshot",
    summary:
      "Metals, energy, and ags overview showing where volatility and price leadership sit before we rebalance cross-complex exposure.",
    tag: {
      label: "Desk preview",
      icon: "clock",
      tone: "neutral-alpha-weak",
    },
  },
  strength: {
    card: {
      title: "Commodity strength meter",
      description:
        "Highlights which contracts carry the current momentum baton.",
      tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
    },
    entries: COMMODITY_STRENGTH_ENTRIES,
  },
  volatilityMeter: {
    card: {
      title: "Commodity volatility meter",
      description:
        "Contracts printing the widest realised ranges this session.",
      tag: {
        label: "Range watch",
        icon: "activity",
        tone: "neutral-alpha-weak",
      },
    },
    entries: COMMODITY_VOLATILITY_ENTRIES,
  },
  movers: {
    card: {
      title: "Top movers",
      description:
        "Percentage and dollar moves for the desk’s core commodity grid.",
      tag: {
        label: "Global flows",
        icon: "trending-up",
        tone: "brand-alpha-weak",
      },
    },
    sections: COMMODITY_MOVERS,
    tableOverrides: {
      columnLabels: {
        change: "Change",
        extra: null,
        last: "Last",
      },
      formatters: {
        changePercent: formatSignedPercent,
        change: formatDecimal(2),
        last: formatDecimal(2),
      },
    },
  },
  volatilityBuckets: {
    card: {
      title: "Volatility radar",
      description:
        "Energy vs metals contrast to frame expected trading ranges.",
      tag: {
        label: "Trading ranges",
        icon: "target",
        tone: "neutral-alpha-weak",
      },
    },
    buckets: COMMODITY_VOLATILITY_BUCKETS,
  },
  momentum: {
    card: {
      title: "Momentum board",
      description: "Desk commentary on standout commodity positioning.",
      tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
    },
    entries: COMMODITY_MOMENTUM,
  },
  heatmap: {
    card: {
      title: "Heat map insight",
      description: "Context from our commodities relative-strength grid.",
      tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    },
    notes: COMMODITY_HEATMAP_NOTES,
    placeholder:
      "Visual heat maps will slot in once the multi-asset feed is wired – placeholders keep the layout ready.",
  },
};

const CRYPTO_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "BTCUSD",
    code: "BTC/USD",
    rank: 1,
    tone: "strong",
    summary:
      "Bitcoin holding the $64k breakout shelf keeps trend bots engaged and alt beta supported.",
  },
  {
    id: "ETHUSD",
    code: "ETH/USD",
    rank: 2,
    tone: "balanced",
    summary:
      "Ether consolidates above $3.1k; watching staking flows for confirmation before adding.",
  },
  {
    id: "SOLUSD",
    code: "SOL/USD",
    rank: 3,
    tone: "strong",
    summary:
      "Layer-1 trade stays active with Solana leading alt momentum – expect higher realised volatility.",
  },
];

const CRYPTO_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "SOLUSD",
    code: "SOL/USD",
    rank: 1,
    summary:
      "Strong participation keeps 24h ranges wide – size positions accordingly.",
  },
  {
    id: "DOGEUSD",
    code: "DOGE/USD",
    rank: 2,
    summary:
      "Meme complex swingy as social chatter spikes; automation trims quickly on reversals.",
  },
  {
    id: "ETHUSD",
    code: "ETH/USD",
    rank: 3,
    summary:
      "Options flow drives intraday swings as traders price the next upgrade roadmap.",
  },
];

const CRYPTO_MOVERS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "SOLUSD",
        label: "Solana",
        symbol: "SOL/USD",
        changePercent: 3.85,
        change: 6.24,
        last: 168.2,
      },
      {
        id: "ETHUSD",
        label: "Ether",
        symbol: "ETH/USD",
        changePercent: 2.14,
        change: 66.5,
        last: 3182.4,
      },
      {
        id: "BTCUSD",
        label: "Bitcoin",
        symbol: "BTC/USD",
        changePercent: 1.78,
        change: 1142.0,
        last: 65420.0,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "DOGEUSD",
        label: "Dogecoin",
        symbol: "DOGE/USD",
        changePercent: -2.65,
        change: -0.0045,
        last: 0.165,
      },
      {
        id: "ADAUSD",
        label: "Cardano",
        symbol: "ADA/USD",
        changePercent: -1.92,
        change: -0.013,
        last: 0.662,
      },
      {
        id: "AVAXUSD",
        label: "Avalanche",
        symbol: "AVAX/USD",
        changePercent: -1.35,
        change: -0.72,
        last: 52.3,
      },
    ],
  },
];

const CRYPTO_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "Momentum alts",
    background: "brand-alpha-weak",
    data: [
      { id: "SOLUSD", label: "Solana", symbol: "SOL/USD", value: 6.4 },
      { id: "AVAXUSD", label: "Avalanche", symbol: "AVAX/USD", value: 5.1 },
      { id: "LINKUSD", label: "Chainlink", symbol: "LINK/USD", value: 4.7 },
    ],
  },
  {
    title: "Stable majors",
    background: "neutral-alpha-weak",
    data: [
      { id: "BTCUSD", label: "Bitcoin", symbol: "BTC/USD", value: 3.2 },
      { id: "ETHUSD", label: "Ether", symbol: "ETH/USD", value: 3.8 },
      { id: "XRPUSD", label: "XRP", symbol: "XRP/USD", value: 2.6 },
    ],
  },
];

const CRYPTO_MOMENTUM: SnapshotMomentumEntry[] = [
  {
    id: "BTCUSD",
    headline: "BTC trend intact",
    detail:
      "Funding neutral and supply absorption strong – keep adds measured while above $62k.",
  },
  {
    id: "ETHUSD",
    headline: "ETH awaiting catalysts",
    detail:
      "Rotation into L2 plays softens impulse – monitor staking metrics for next signal.",
  },
  {
    id: "SOLUSD",
    headline: "SOL momentum high",
    detail:
      "Ecosystem inflows keep momentum bots long, but we fade parabolic spikes intraday.",
  },
];

const CRYPTO_HEATMAP_NOTES = [
  "Layer-1 momentum dominates the heat map with Solana and Avalanche in the lead quadrant.",
  "Stablecoins hold neutral – no signs of broad de-risking yet.",
  "DeFi tokens lag but are curling higher alongside Ethereum strength.",
];

export const CRYPTO_SNAPSHOT_CONFIG: StaticMarketSnapshotConfig = {
  id: "crypto-market-snapshot",
  hero: {
    heading: "Crypto market snapshot",
    summary:
      "All-asset crypto desk read showing where trend bots focus, where volatility sits, and the narrative shaping positioning.",
    tag: {
      label: "Desk preview",
      icon: "clock",
      tone: "neutral-alpha-weak",
    },
  },
  strength: {
    card: {
      title: "Crypto strength meter",
      description: "Momentum leaders across the majors and high-beta alts.",
      tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
    },
    entries: CRYPTO_STRENGTH_ENTRIES,
  },
  volatilityMeter: {
    card: {
      title: "Crypto volatility meter",
      description: "Names printing the widest 24h realised ranges right now.",
      tag: {
        label: "Range watch",
        icon: "activity",
        tone: "neutral-alpha-weak",
      },
    },
    entries: CRYPTO_VOLATILITY_ENTRIES,
  },
  movers: {
    card: {
      title: "Top movers",
      description:
        "Percentage moves and dollar changes for the majors and favourite alts.",
      tag: {
        label: "Global session",
        icon: "trending-up",
        tone: "brand-alpha-weak",
      },
    },
    sections: CRYPTO_MOVERS,
    tableOverrides: {
      columnLabels: {
        change: "Change ($)",
        extra: null,
        last: "Last ($)",
      },
      formatters: {
        changePercent: formatSignedPercent,
        change: formatDecimal(2, { prefix: "$" }),
        last: formatDecimal(2, { prefix: "$" }),
      },
    },
  },
  volatilityBuckets: {
    card: {
      title: "Volatility radar",
      description:
        "Compare momentum alts against steadier majors before rotating risk.",
      tag: {
        label: "Trading ranges",
        icon: "target",
        tone: "neutral-alpha-weak",
      },
    },
    buckets: CRYPTO_VOLATILITY_BUCKETS,
  },
  momentum: {
    card: {
      title: "Momentum board",
      description: "Quick read on standout crypto positioning.",
      tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
    },
    entries: CRYPTO_MOMENTUM,
  },
  heatmap: {
    card: {
      title: "Heat map insight",
      description:
        "Narrative context from the crypto relative-strength matrix.",
      tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    },
    notes: CRYPTO_HEATMAP_NOTES,
    placeholder:
      "Full heat map visualisation is staged and ready once the live data feed switches on.",
  },
};

const INDICES_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "NAS100",
    code: "Nasdaq 100",
    rank: 1,
    tone: "strong",
    summary:
      "Growth leadership persists as megacap tech extends gains – watch earnings for catalyst risk.",
  },
  {
    id: "SPX500",
    code: "S&P 500",
    rank: 2,
    tone: "balanced",
    summary:
      "Index grinds higher with breadth improving; automation keeps risk-on but nimble.",
  },
  {
    id: "GER30",
    code: "DAX 30",
    rank: 3,
    tone: "balanced",
    summary:
      "European indices stabilise as data surprises to the upside – scope for catch-up rotation.",
  },
];

const INDICES_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "US2000",
    code: "Russell 2000",
    rank: 1,
    summary:
      "Small caps remain choppy with rates repricing – size down and lean on hedges.",
  },
  {
    id: "HKG33",
    code: "Hang Seng",
    rank: 2,
    summary:
      "China headline risk keeps realised volatility elevated – automation trades around core exposure.",
  },
  {
    id: "JPN225",
    code: "Nikkei 225",
    rank: 3,
    summary:
      "BOJ policy speculation fuels wide ranges – keep alerts on FX correlation.",
  },
];

const INDICES_MOVERS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "NAS100",
        label: "Nasdaq 100",
        symbol: "NAS100",
        changePercent: 1.12,
        change: 190.5,
        last: 17240.0,
      },
      {
        id: "GER30",
        label: "DAX 30",
        symbol: "GER30",
        changePercent: 0.86,
        change: 142.1,
        last: 16790.0,
      },
      {
        id: "AUS200",
        label: "ASX 200",
        symbol: "AUS200",
        changePercent: 0.74,
        change: 51.4,
        last: 7018.0,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "HKG33",
        label: "Hang Seng",
        symbol: "HKG33",
        changePercent: -1.35,
        change: -242.0,
        last: 17680.0,
      },
      {
        id: "ESP35",
        label: "Spain 35",
        symbol: "ESP35",
        changePercent: -0.92,
        change: -86.4,
        last: 9340.0,
      },
      {
        id: "CHN50",
        label: "China A50",
        symbol: "CHN50",
        changePercent: -0.78,
        change: -104.5,
        last: 13280.0,
      },
    ],
  },
];

const INDICES_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "US indices",
    background: "brand-alpha-weak",
    data: [
      { id: "NAS100", label: "Nasdaq 100", symbol: "NAS100", value: 1.4 },
      { id: "SPX500", label: "S&P 500", symbol: "SPX500", value: 1.1 },
      { id: "US2000", label: "Russell 2000", symbol: "US2000", value: 1.9 },
    ],
  },
  {
    title: "Global indices",
    background: "neutral-alpha-weak",
    data: [
      { id: "GER30", label: "DAX 30", symbol: "GER30", value: 1.3 },
      { id: "HKG33", label: "Hang Seng", symbol: "HKG33", value: 2.1 },
      { id: "JPN225", label: "Nikkei 225", symbol: "JPN225", value: 1.7 },
    ],
  },
];

const INDICES_MOMENTUM: SnapshotMomentumEntry[] = [
  {
    id: "SPX500",
    headline: "S&P 500 grinding higher",
    detail:
      "Breadth improving with cyclical participation – stay constructive while above 5200 support.",
  },
  {
    id: "NAS100",
    headline: "Nasdaq leadership intact",
    detail:
      "AI complex keeps momentum positive; watch for exhaustion near all-time highs.",
  },
  {
    id: "US2000",
    headline: "Russell rebalancing",
    detail:
      "Rates sensitivity still elevated – hedge overlays remain active until spreads compress.",
  },
];

const INDICES_HEATMAP_NOTES = [
  "US tech sits in the leadership quadrant while European indices edge higher on improving PMIs.",
  "Asia-Pacific remains mixed with Japan strong and China lagging.",
  "Volatility concentrated in small caps and Hong Kong – plan hedges accordingly.",
];

export const INDICES_SNAPSHOT_CONFIG: StaticMarketSnapshotConfig = {
  id: "indices-market-snapshot",
  hero: {
    heading: "Indices market snapshot",
    summary:
      "Global index dashboard framing leadership, dispersion, and the macro talking points for positioning.",
    tag: {
      label: "Desk preview",
      icon: "clock",
      tone: "neutral-alpha-weak",
    },
  },
  strength: {
    card: {
      title: "Index strength meter",
      description:
        "Momentum leadership across US and global benchmarks at a glance.",
      tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
    },
    entries: INDICES_STRENGTH_ENTRIES,
  },
  volatilityMeter: {
    card: {
      title: "Index volatility meter",
      description: "Benchmarks with the widest realised ranges this session.",
      tag: {
        label: "Range watch",
        icon: "activity",
        tone: "neutral-alpha-weak",
      },
    },
    entries: INDICES_VOLATILITY_ENTRIES,
  },
  movers: {
    card: {
      title: "Top movers",
      description: "Percentage and point moves across major global indices.",
      tag: {
        label: "Global session",
        icon: "trending-up",
        tone: "brand-alpha-weak",
      },
    },
    sections: INDICES_MOVERS,
    tableOverrides: {
      columnLabels: {
        change: "Change (pts)",
        extra: null,
        last: "Last",
      },
      formatters: {
        changePercent: formatSignedPercent,
        change: formatDecimal(1),
        last: formatDecimal(1),
      },
    },
  },
  volatilityBuckets: {
    card: {
      title: "Volatility radar",
      description: "US vs global dispersion snapshot for hedging decisions.",
      tag: {
        label: "Trading ranges",
        icon: "target",
        tone: "neutral-alpha-weak",
      },
    },
    buckets: INDICES_VOLATILITY_BUCKETS,
  },
  momentum: {
    card: {
      title: "Momentum board",
      description: "Macro context guiding the index desk playbook.",
      tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
    },
    entries: INDICES_MOMENTUM,
  },
  heatmap: {
    card: {
      title: "Heat map insight",
      description: "Rotation narrative from the global index matrix.",
      tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    },
    notes: INDICES_HEATMAP_NOTES,
    placeholder:
      "Heat map view activates with the live multi-asset feed – layout is staged for plug-in.",
  },
};

const STOCK_STRENGTH_ENTRIES: StrengthMeterEntry[] = [
  {
    id: "AAPL",
    code: "AAPL",
    rank: 1,
    tone: "strong",
    summary:
      "Megacap tech leadership intact as Apple breaks higher on AI hardware narrative.",
  },
  {
    id: "MSFT",
    code: "MSFT",
    rank: 2,
    tone: "balanced",
    summary:
      "Microsoft consolidating gains; cloud growth keeps buyers interested on dips.",
  },
  {
    id: "NVDA",
    code: "NVDA",
    rank: 3,
    tone: "strong",
    summary:
      "AI complex drives Nvidia to fresh highs – automation trails tightly in case of reversal.",
  },
];

const STOCK_VOLATILITY_ENTRIES: VolatilityMeterEntry[] = [
  {
    id: "TSLA",
    code: "TSLA",
    rank: 1,
    summary:
      "Tesla swings on delivery numbers and pricing chatter – expect outsized moves around headlines.",
  },
  {
    id: "NVDA",
    code: "NVDA",
    rank: 2,
    summary:
      "Chip leadership keeps realised volatility elevated as traders chase AI demand.",
  },
  {
    id: "META",
    code: "META",
    rank: 3,
    summary:
      "Meta reacts to ad spend updates – intraday ranges widen around earnings previews.",
  },
];

const STOCK_MOVERS_SECTIONS: MoversSection[] = [
  {
    title: "Top gainers",
    tone: "brand-alpha-weak",
    iconName: "trending-up",
    data: [
      {
        id: "NVDA",
        label: "Nvidia",
        symbol: "NVDA",
        changePercent: 2.85,
        change: 31.42,
        last: 1134.2,
      },
      {
        id: "AAPL",
        label: "Apple",
        symbol: "AAPL",
        changePercent: 1.42,
        change: 2.67,
        last: 191.6,
      },
      {
        id: "MSFT",
        label: "Microsoft",
        symbol: "MSFT",
        changePercent: 1.18,
        change: 4.78,
        last: 411.2,
      },
    ],
  },
  {
    title: "Top losers",
    tone: "danger-alpha-weak",
    iconName: "trending-down",
    data: [
      {
        id: "TSLA",
        label: "Tesla",
        symbol: "TSLA",
        changePercent: -2.65,
        change: -4.98,
        last: 183.4,
      },
      {
        id: "NFLX",
        label: "Netflix",
        symbol: "NFLX",
        changePercent: -1.84,
        change: -11.2,
        last: 598.5,
      },
      {
        id: "AMD",
        label: "AMD",
        symbol: "AMD",
        changePercent: -1.35,
        change: -2.12,
        last: 155.8,
      },
    ],
  },
];

const STOCK_VOLATILITY_BUCKETS: VolatilityBucket[] = [
  {
    title: "High beta",
    background: "brand-alpha-weak",
    data: [
      { id: "TSLA", label: "Tesla", symbol: "TSLA", value: 3.8 },
      { id: "NVDA", label: "Nvidia", symbol: "NVDA", value: 3.4 },
      { id: "AMD", label: "AMD", symbol: "AMD", value: 3.1 },
    ],
  },
  {
    title: "Defensive",
    background: "neutral-alpha-weak",
    data: [
      { id: "JNJ", label: "Johnson & Johnson", symbol: "JNJ", value: 1.2 },
      { id: "PG", label: "Procter & Gamble", symbol: "PG", value: 1.0 },
      { id: "KO", label: "Coca-Cola", symbol: "KO", value: 0.9 },
    ],
  },
];

const STOCK_MOMENTUM_ENTRIES: SnapshotMomentumEntry[] = [
  {
    id: "AAPL",
    headline: "Apple leadership",
    detail:
      "AI hardware tailwind keeps flows positive – automation adds on dips while above $185.",
  },
  {
    id: "NVDA",
    headline: "Nvidia momentum elevated",
    detail:
      "Chip shortage narrative and AI demand keep trend intact – watch for exhaustion gaps.",
  },
  {
    id: "TSLA",
    headline: "Tesla volatility high",
    detail:
      "Delivery headlines swing sentiment – keep position sizes modest and hedge gamma.",
  },
];

const STOCK_HEATMAP_NOTES = [
  "Megacap tech sits in the leadership quadrant while defensives tread water.",
  "Discretionary names lag after earnings downgrades – rotation still favouring AI.",
  "Financials steady as yields stabilise, offering ballast to the broader index.",
];

export const STOCKS_SNAPSHOT_CONFIG: StaticMarketSnapshotConfig = {
  id: "stocks-market-snapshot",
  hero: {
    heading: "Equities market snapshot",
    summary:
      "Equity desk overview covering leadership, volatility, and the playbook narrative for today’s US session.",
    tag: {
      label: "Desk preview",
      icon: "clock",
      tone: "neutral-alpha-weak",
    },
  },
  strength: {
    card: {
      title: "Equity strength meter",
      description: "Quick scan of the equities carrying leadership.",
      tag: { label: "Leadership", icon: "flag", tone: "brand-alpha-weak" },
    },
    entries: STOCK_STRENGTH_ENTRIES,
  },
  volatilityMeter: {
    card: {
      title: "Equity volatility meter",
      description:
        "Names posting the widest realised ranges so you can calibrate position sizing.",
      tag: {
        label: "Range watch",
        icon: "activity",
        tone: "neutral-alpha-weak",
      },
    },
    entries: STOCK_VOLATILITY_ENTRIES,
  },
  movers: {
    card: {
      title: "Top movers",
      description:
        "Change, dollar move, and last trade snapshot for the desk’s equity focus list.",
      tag: {
        label: "US session",
        icon: "trending-up",
        tone: "brand-alpha-weak",
      },
    },
    sections: STOCK_MOVERS_SECTIONS,
    tableOverrides: {
      columnLabels: {
        change: "Change ($)",
        extra: null,
        last: "Last ($)",
      },
      formatters: {
        changePercent: formatSignedPercent,
        change: formatDecimal(2, { prefix: "$" }),
        last: formatDecimal(2, { prefix: "$" }),
      },
    },
  },
  volatilityBuckets: {
    card: {
      title: "Volatility radar",
      description:
        "Contrast the highest-beta names with low-volatility defensives before adjusting exposure.",
      tag: {
        label: "Trading ranges",
        icon: "target",
        tone: "neutral-alpha-weak",
      },
    },
    buckets: STOCK_VOLATILITY_BUCKETS,
  },
  momentum: {
    card: {
      title: "Momentum board",
      description:
        "Quick read on which equities the desk automation currently favours.",
      tag: { label: "Momentum", icon: "zap", tone: "brand-alpha-weak" },
    },
    entries: STOCK_MOMENTUM_ENTRIES,
  },
  heatmap: {
    card: {
      title: "Heat map insight",
      description:
        "Desk matrix highlighting relative momentum – live view coming soon.",
      tag: { label: "Playbook", icon: "grid", tone: "neutral-alpha-weak" },
    },
    notes: STOCK_HEATMAP_NOTES,
    placeholder:
      "Heat map visual goes live once the equities data feed is wired – copy keeps the layout primed.",
  },
};
