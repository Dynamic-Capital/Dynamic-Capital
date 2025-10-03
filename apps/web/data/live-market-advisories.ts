import type { AssetClass } from "@/data/instruments";

type AdvisoryStance = "Bullish" | "Neutral" | "Bearish";

export interface LiveMarketAdvisory {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  stance: AdvisoryStance;
  conviction: number;
  headline: string;
  summary: string;
  actions: string[];
  hedges: string[];
  riskNotes: string[];
  macroDrivers: string[];
  updatedAt: string;
}

export const LIVE_MARKET_ADVISORIES: LiveMarketAdvisory[] = [
  {
    symbol: "EURUSD",
    name: "Euro vs US Dollar",
    assetClass: "currencies",
    stance: "Bullish",
    conviction: 0.62,
    headline: "EURUSD holds constructive bias above 1.0900",
    summary:
      "Seasonal support and softer US yields keep the pair bid while positioning remains short the euro.",
    actions: [
      "Add exposure on pullbacks into the 1.0880/1.0900 liquidity shelf to stay aligned with the trend.",
      "Trail protective stops under 1.0835 in case US data reaccelerates the dollar bid.",
      "Take partial profits into 1.0985 where supply from the May high re-emerges.",
    ],
    hedges: [
      "Pair with a light EURJPY short to offset yen strength risk if carry unwinds.",
      "Hold modest DXY downside optionality as a systemic hedge against a USD squeeze.",
    ],
    riskNotes: [
      "US CPI later in the session could spark a dollar rebound if the print surprises hotter.",
      "ECB speakers remain cautious; hawkish rhetoric would mute upside follow-through.",
    ],
    macroDrivers: [
      "Eurozone PMIs stabilised while US yields grind lower, favouring EUR resilience.",
      "CFTC data shows shorts still elevated, keeping squeeze dynamics alive.",
    ],
    updatedAt: "2025-09-25T04:30:00.000Z",
  },
  {
    symbol: "XAUUSD",
    name: "Gold",
    assetClass: "commodities",
    stance: "Bullish",
    conviction: 0.58,
    headline: "Gold bid persists as macro hedge flows stay active",
    summary:
      "Desk automation continues to recycle gains above $2,400 while real yields drift lower.",
    actions: [
      "Maintain core longs while price holds the $2,385 pivot; reload on shallow pullbacks.",
      "Scale risk into $2,445/$2,450 where the previous breakout paused.",
      "Monitor Asia session liquidity to lean on momentum only when depth improves.",
    ],
    hedges: [
      "Offset exposure with a small long in USDJPY to cushion any rate spike.",
      "Retain silver pairs as a dispersion hedge if gold underperforms metals peers.",
    ],
    riskNotes: [
      "Faster Fed repricing or a dollar squeeze would cap topside progress.",
      "Macro calendar is thin; without fresh catalysts momentum may fade intraday.",
    ],
    macroDrivers: [
      "Real yields softened after dovish FOMC commentary, encouraging hedge demand.",
      "ETF inflows picked up for the first time in six weeks, reinforcing structural support.",
    ],
    updatedAt: "2025-09-25T04:20:00.000Z",
  },
  {
    symbol: "BTCUSD",
    name: "Bitcoin",
    assetClass: "crypto",
    stance: "Bullish",
    conviction: 0.66,
    headline: "Bitcoin momentum supported by ETF inflows and AI rotation",
    summary:
      "The desk keeps the automation bias long while treasury hedges manage volatility around $64k.",
    actions: [
      "Accumulate on dips into $62.5k where liquidity consistently refreshes.",
      "Trail dynamic stops below $60k to protect the weekly trend structure.",
      "Rotate partial gains into AI-aligned alt basket when momentum exceeds +6%.",
    ],
    hedges: [
      "Hold ETHBTC neutral spread to cushion sector rotation shocks.",
      "Keep treasury with 15% cash allocation ready for volatility spikes.",
    ],
    riskNotes: [
      "ETF flow pace could slow near quarter-end, reducing passive bid support.",
      "Macro risk-off events would pressure correlated tech equity plays.",
    ],
    macroDrivers: [
      "ETF net subscriptions extended for a fourth session, sustaining demand.",
      "AI narrative rotation keeps digital asset allocation elevated across desks.",
    ],
    updatedAt: "2025-09-25T04:05:00.000Z",
  },
  {
    symbol: "SPX500",
    name: "S&P 500 Index",
    assetClass: "indices",
    stance: "Neutral",
    conviction: 0.52,
    headline: "S&P 500 consolidates ahead of mega-cap earnings",
    summary:
      "Range trading persists as earnings season begins; desk keeps bias neutral with selective sector tilts.",
    actions: [
      "Fade extremes between 5,450 resistance and 5,360 support using tight option structures.",
      "Overweight quality tech until earnings confirm leadership or signal rotation.",
      "Scale exposure down before key prints to preserve dry powder.",
    ],
    hedges: [
      "Long volatility through front-month call spreads to cushion breakout risk.",
      "Maintain downside puts in equal-weight indices as breadth stays fragile.",
    ],
    riskNotes: [
      "Earnings misses from mega-caps would quickly pressure the index lower.",
      "Breadth deterioration warns against leaning too hard into the current range.",
    ],
    macroDrivers: [
      "Financial conditions remain easy but economic surprise index has flattened.",
      "Institutional positioning reloaded modest longs, reducing upside fuel.",
    ],
    updatedAt: "2025-09-25T03:55:00.000Z",
  },
  {
    symbol: "NVDA",
    name: "Nvidia",
    assetClass: "stocks",
    stance: "Bullish",
    conviction: 0.57,
    headline: "Nvidia bid returns as AI capex pipeline stays intact",
    summary:
      "Flow trackers show renewed demand from funds adding exposure into the next product launch window.",
    actions: [
      "Add on dips toward $108 adjusted split price where buy programs reload.",
      "Scale profits into $118/$120 where supply from last month's gap sits.",
      "Pair exposure with a basket of AI infrastructure plays to diversify execution.",
    ],
    hedges: [
      "Short SMH against NVDA to manage sector beta during earnings noise.",
      "Keep tight gamma hedges via weekly put spreads when implied vol cheapens.",
    ],
    riskNotes: [
      "Guidance sensitivity remains high; any mention of supply constraints would sting.",
      "Valuation premium invites fast de-risking if growth expectations wobble.",
    ],
    macroDrivers: [
      "Cloud providers reaffirmed 2025 capex plans, sustaining GPU demand visibility.",
      "Semiconductor lead-times stabilised, easing concerns about double ordering.",
    ],
    updatedAt: "2025-09-25T03:45:00.000Z",
  },
  {
    symbol: "USDJPY",
    name: "US Dollar vs Japanese Yen",
    assetClass: "currencies",
    stance: "Bearish",
    conviction: 0.43,
    headline: "USDJPY slips as carry unwinds on Bank of Japan jawboning",
    summary:
      "Desk trims exposure with a defensive bias after MoF rhetoric sparked a squeeze lower.",
    actions: [
      "Sell rallies into 148.80/149.10 where recent breakdown originated.",
      "Use intraday momentum signals to scalp around the developing downtrend channel.",
      "Reduce size ahead of Tokyo fix to avoid headline volatility.",
    ],
    hedges: [
      "Hold Nikkei long exposure to offset yen strength on equity-positive news.",
      "Maintain short-dated call spreads in USDJPY as protection against intervention whipsaws.",
    ],
    riskNotes: [
      "US yields bouncing would reignite carry appetite and squeeze shorts.",
      "Official intervention remains a wildcard, amplifying intraday volatility.",
    ],
    macroDrivers: [
      "BoJ officials hinted at policy normalisation while MoF kept verbal intervention elevated.",
      "US-Japan rate differentials narrowed modestly as Treasuries rallied.",
    ],
    updatedAt: "2025-09-25T03:35:00.000Z",
  },
];
