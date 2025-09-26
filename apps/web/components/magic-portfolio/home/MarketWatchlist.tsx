"use client";

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type Colors,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import type { IconName } from "@/resources/icons";
import { formatIsoTime } from "@/utils/isoFormat";
import {
  type AssetClass,
  findInstrumentMetadata,
  getInstrumentMetadata,
} from "@/data/instruments";
import {
  balanceTextColor,
  type BalanceTone,
  balanceToneClass,
} from "@/utils/balancePalette";

interface StrategyPlaybook {
  automation: string;
  support?: number;
  resistance?: number;
  flipLevel?: number;
  momentum?: {
    bullish: number;
    bearish: number;
  };
  plan: {
    default: string;
    bullish: string;
    bearish: string;
  };
}

interface MarketWatchlistItem {
  symbol: string;
  displaySymbol: string;
  name: string;
  category: InstrumentCategory;
  session: string;
  focus: string;
  beginnerTip: string;
  bias: "Long" | "Short" | "Monitoring";
  dataKey: string;
  format: Intl.NumberFormatOptions;
  playbook?: StrategyPlaybook;
}

type InstrumentCategory = "Crypto" | "FX" | "Metals" | "Indices";

type MarketQuote = {
  last: number;
  changePercent: number;
  high: number;
  low: number;
};

type BiasVisual = {
  label: string;
  tone?: BalanceTone;
  fallbackBackground?: Colors;
  fallbackOnBackground?: Colors;
};

type CategoryVisual = {
  icon: IconName;
  label: string;
};

type InsightTone = "bullish" | "neutral" | "bearish";

type InsightVisual = {
  label: string;
  icon: IconName;
  tone: InsightTone;
};

type IconBackground = ComponentProps<typeof Icon>["onBackground"];

type InsightToneStyle = {
  tone?: BalanceTone;
  fallbackBackground?: Colors;
  fallbackIcon?: IconBackground;
  fallbackText?: Colors;
};

const INSIGHT_TONE_STYLES: Record<InsightTone, InsightToneStyle> = {
  bullish: { tone: "bullish" },
  neutral: {
    fallbackBackground: "neutral-alpha-weak",
    fallbackIcon: "neutral-medium",
    fallbackText: "neutral-strong",
  },
  bearish: { tone: "bearish" },
};

type MarketApiQuote = {
  bid?: string;
  pctChange?: string;
  high?: string;
  low?: string;
  create_date?: string;
};

type MarketApiResponse = Record<string, MarketApiQuote>;

const REFRESH_INTERVAL_MS = 60_000;

const CATEGORY_DETAILS: Record<InstrumentCategory, CategoryVisual> = {
  Crypto: { icon: "sparkles", label: "Crypto" },
  FX: { icon: "globe", label: "FX majors" },
  Metals: { icon: "sparkles", label: "Metals" },
  Indices: { icon: "grid", label: "Indices" },
};

const BIAS_DETAILS: Record<MarketWatchlistItem["bias"], BiasVisual> = {
  Long: { label: "Long bias", tone: "bullish" },
  Short: { label: "Short bias", tone: "bearish" },
  Monitoring: {
    label: "Monitoring",
    fallbackBackground: "neutral-alpha-weak",
    fallbackOnBackground: "neutral-strong",
  },
};

const CATEGORY_BY_ASSET_CLASS: Record<AssetClass, InstrumentCategory> = {
  commodities: "Metals",
  currencies: "FX",
  indices: "Indices",
  crypto: "Crypto",
};

const DEFAULT_NUMBER_FORMAT: Intl.NumberFormatOptions = {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

type WatchlistConfigEntry =
  & Omit<
    MarketWatchlistItem,
    "symbol" | "displaySymbol" | "name" | "category" | "dataKey" | "format"
  >
  & {
    instrumentId: string;
    formatOverride?: Intl.NumberFormatOptions;
    categoryOverride?: InstrumentCategory;
  };

const WATCHLIST_CONFIG: WatchlistConfigEntry[] = [
  {
    instrumentId: "XAUUSD",
    session: "Asia accumulation",
    focus:
      "Risk-off flows keep gold bid; running partial hedge overlay with alerts for a break of $2,400 support to flip defensive.",
    beginnerTip:
      "Gold is the safety trade. We stay cautious if price slips under $2,400 and look for steadier moves before adding risk.",
    bias: "Monitoring",
    playbook: {
      automation:
        "Metals algo sync trims exposure if $2,400 gives way and scales back in on reclaim.",
      support: 2400,
      resistance: 2445,
      flipLevel: 2400,
      momentum: { bullish: 0.6, bearish: 0.5 },
      plan: {
        default:
          "Keep partial hedge overlay running while gold oscillates between $2,400 support and the $2,445 supply shelf; automation monitors the ladder for rebalance signals.",
        bullish:
          "If momentum stays positive above $2,445 the trend leg adds risk in measured clips while the hedge automation trails the move.",
        bearish:
          "A clean break under $2,400 hands control to the hedge overlay automation until flows stabilize.",
      },
    },
  },
  {
    instrumentId: "DXY",
    session: "Global dollar flows",
    focus:
      "Watching rate expectations and Treasury auctions for momentum cues. Dollar strength keeps risk desks defensive on global beta.",
    beginnerTip:
      "When the dollar index rises, other currencies and risk assets usually cool off. Strong DXY means scale position sizes down.",
    bias: "Long",
    playbook: {
      automation:
        "Macro hedge algo scales defensive overlays as the dollar momentum firmed up.",
      support: 105.1,
      resistance: 105.9,
      momentum: { bullish: 0.4, bearish: 0.4 },
      plan: {
        default:
          "Stay defensive on global beta while the dollar holds between the 105.10 pivot and 105.90 supply, keeping macro automation in sync.",
        bullish:
          "Above 105.90 we let the dollar-strength algo tighten risk on equities and EM FX.",
        bearish:
          "If the index slips beneath 105.10 we relax hedges and let automation reopen carry trades methodically.",
      },
    },
  },
  {
    instrumentId: "USDJPY",
    session: "Tokyo carry unwind",
    focus:
      "Tracking MoF rhetoric and US yields for timing on fresh shorts. Alerted automation for spikes sub 147.00 as risk trigger.",
    beginnerTip:
      "A falling USD/JPY means the yen is getting stronger. Quick drops toward 147 are our cue to slow down and reassess entries.",
    bias: "Monitoring",
    playbook: {
      automation:
        "Asia FX algo arms fresh shorts on spikes sub 147.00 and reloads into orderly pullbacks.",
      support: 147,
      resistance: 149.5,
      flipLevel: 147,
      momentum: { bullish: 0.5, bearish: 0.5 },
      plan: {
        default:
          "We fade rallies while price is capped below 149.50 and watch MoF rhetoric for catalysts as automation stages entries.",
        bullish:
          "If USD/JPY squeezes above 149.50 the automation stands down and we trail risk using options.",
        bearish:
          "Momentum under 147.00 re-engages the short program with tight automated risk controls.",
      },
    },
  },
  {
    instrumentId: "GBPUSD",
    session: "London spot flow",
    focus:
      "Watching BoE commentary and US data for continuation shorts while price is capped below key weekly supply near 1.36.",
    beginnerTip:
      "Sellers stay in control while GBP/USD holds below 1.36. Keep any long ideas small and respect the broader downtrend.",
    bias: "Short",
    playbook: {
      automation:
        "Cable short algo scales clips while price stays below weekly supply near 1.3600.",
      support: 1.342,
      resistance: 1.36,
      flipLevel: 1.36,
      momentum: { bullish: 0.35, bearish: 0.35 },
      plan: {
        default:
          "Respect the broader downtrend and lean on rallies into 1.3600 for fresh supply while automation scales clips.",
        bullish:
          "A sustained push above 1.3600 forces us to cover shorts and shift to neutral while the algo pauses.",
        bearish:
          "Weakness toward 1.3400 keeps the short program automation active with staggered profit targets.",
      },
    },
  },
  {
    instrumentId: "BTCUSD",
    session: "London momentum",
    focus:
      "Scaling automation on the $64k breakout shelf while funding stays balanced. Monitoring for exhaustion near $66k liquidity.",
    beginnerTip:
      "Bitcoin pushing above $64k keeps bullish momentum alive, but we plan exits near $66k in case buyers tire out.",
    bias: "Long",
    playbook: {
      automation:
        "Digital assets algo scales in above the $64k shelf and trims into $66k liquidity.",
      support: 64000,
      resistance: 66000,
      momentum: { bullish: 0.8, bearish: 0.6 },
      plan: {
        default:
          "Maintain breakout exposure while price respects the $64k base and funding stays balanced with automation pacing adds.",
        bullish:
          "If momentum rips beyond $66k we let the trend bot press longs and slide stops higher.",
        bearish:
          "Losing $64k hands control to risk-off protocols and we reduce to core holdings via automation.",
      },
    },
  },
  {
    instrumentId: "ETHUSD",
    session: "US overlap",
    focus:
      "Looking for acceptance above $3.1k to continue the weekly trend. Mentors tightening invalidation beneath $2.95k swing lows.",
    beginnerTip:
      "Ether needs to hold above $3.1k to confirm the uptrend. Below $2.95k we step aside and wait for clarity.",
    bias: "Long",
    playbook: {
      automation:
        "ETH momentum algo tightens invalidation beneath $2.95k and adds back above $3.10k.",
      support: 2950,
      resistance: 3100,
      flipLevel: 2950,
      momentum: { bullish: 0.7, bearish: 0.6 },
      plan: {
        default:
          "Keep swing core intact while Ether respects the $2.95k higher-low and $3.10k breakout level with automation policing invalidation.",
        bullish:
          "Strength through $3.10k lets automation stack exposure while rolling stops behind the move.",
        bearish:
          "Breaks under $2.95k shift us to capital preservation until the structure rebuilds under automation supervision.",
      },
    },
  },
];

const WATCHLIST: MarketWatchlistItem[] = WATCHLIST_CONFIG.map((item) => {
  const metadata = getInstrumentMetadata(item.instrumentId);
  const category = item.categoryOverride ??
    CATEGORY_BY_ASSET_CLASS[metadata.assetClass];
  const format = item.formatOverride ?? metadata.format ??
    DEFAULT_NUMBER_FORMAT;

  return {
    symbol: metadata.id,
    displaySymbol: metadata.displaySymbol,
    name: metadata.name,
    category,
    session: item.session,
    focus: item.focus,
    beginnerTip: item.beginnerTip,
    bias: item.bias,
    dataKey: metadata.id,
    format,
    playbook: item.playbook,
  };
});

const toMarketCode = (symbol: string) => {
  const metadata = findInstrumentMetadata(symbol);
  if (!metadata?.base || !metadata.quote) {
    return null;
  }
  return `${metadata.base}-${metadata.quote}`;
};

const DXY_COMPOSITION: Array<{ instrumentId: string; exponent: number }> = [
  { instrumentId: "EURUSD", exponent: -0.576 },
  { instrumentId: "USDJPY", exponent: 0.136 },
  { instrumentId: "GBPUSD", exponent: -0.119 },
  { instrumentId: "USDCAD", exponent: 0.091 },
  { instrumentId: "USDSEK", exponent: 0.042 },
  { instrumentId: "USDCHF", exponent: 0.036 },
];

const MARKET_CODES = Array.from(
  new Set(
    [
      ...WATCHLIST.map((item) => item.dataKey),
      ...DXY_COMPOSITION.map((entry) => entry.instrumentId),
    ]
      .map(toMarketCode)
      .filter((code): code is string => Boolean(code)),
  ),
);

const MARKET_ENDPOINT = `https://economia.awesomeapi.com.br/last/${
  MARKET_CODES.join(",")
}`;

const NUMBER_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

const formatChangePercent = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  const absolute = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${absolute}%`;
  }
  if (value < 0) {
    return `-${absolute}%`;
  }
  return `${absolute}%`;
};

const getFormatter = (options: Intl.NumberFormatOptions) => {
  const key = JSON.stringify(options);
  const cached = NUMBER_FORMATTER_CACHE.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat("en-US", options);
  NUMBER_FORMATTER_CACHE.set(key, formatter);
  return formatter;
};

const formatNumber = (
  value: number | undefined,
  options: Intl.NumberFormatOptions,
) => {
  if (value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return getFormatter(options).format(value);
};

const formatRange = (
  quote: MarketQuote | undefined,
  options: Intl.NumberFormatOptions,
) => {
  if (!quote) {
    return "—";
  }
  if (!Number.isFinite(quote.low) || !Number.isFinite(quote.high)) {
    return "—";
  }
  const low = formatNumber(quote.low, options);
  const high = formatNumber(quote.high, options);
  if (low === "—" || high === "—") {
    return "—";
  }
  return `${low} – ${high}`;
};

const describeLevelProximity = (
  price: number,
  level: number,
  type: "support" | "resistance",
  options: Intl.NumberFormatOptions,
) => {
  const levelLabel = formatNumber(level, options);
  if (levelLabel === "—") {
    return "";
  }

  const deltaPercent = Math.abs((price - level) / level) * 100;
  if (deltaPercent < 0.15) {
    return `Sitting on ${type} ${levelLabel}.`;
  }
  if (deltaPercent < 0.4) {
    const direction = price > level ? "testing" : "pressing";
    return `${direction} ${type} ${levelLabel}.`;
  }

  if (type === "support") {
    return price > level
      ? `Holding above support ${levelLabel}.`
      : `Below support ${levelLabel}.`;
  }

  return price < level
    ? `Holding below resistance ${levelLabel}.`
    : `Through resistance ${levelLabel}.`;
};

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const stripTrailingPeriod = (value: string) => {
  const collapsed = collapseWhitespace(value);
  return collapsed.endsWith(".") ? collapsed.slice(0, -1) : collapsed;
};

const createInsight = (
  label: string,
  icon: IconName,
  tone: InsightTone = "neutral",
): InsightVisual => ({
  label: collapseWhitespace(label),
  icon,
  tone,
});

const determineLevelTone = (
  normalized: string,
  type: "support" | "resistance",
): InsightTone => {
  const lower = normalized.toLowerCase();
  if (type === "support") {
    if (lower.includes("below support") || lower.includes("pressing support")) {
      return "bearish";
    }
    if (lower.includes("holding above support")) {
      return "bullish";
    }
    return "neutral";
  }

  if (
    lower.includes("through resistance") ||
    lower.includes("testing resistance")
  ) {
    return "bullish";
  }
  return "neutral";
};

const buildLevelInsight = (
  message: string,
  type: "support" | "resistance",
): InsightVisual | null => {
  if (!message) {
    return null;
  }
  const normalized = stripTrailingPeriod(message);
  if (!normalized) {
    return null;
  }

  const tone = determineLevelTone(normalized, type);
  const icon = type === "support" ? "shield" : "flag";
  const prefix = type === "support" ? "Support" : "Resistance";

  return createInsight(`${prefix}: ${normalized}`, icon, tone);
};

const fallbackInsights = (text: string, icon: IconName): InsightVisual[] => {
  const normalized = collapseWhitespace(text);
  return normalized ? [createInsight(normalized, icon, "neutral")] : [];
};

const buildQuickTakeaway = (
  item: MarketWatchlistItem,
  quote: MarketQuote | undefined,
): InsightVisual[] => {
  const price = quote?.last;
  const { playbook } = item;

  if (
    price === undefined ||
    !Number.isFinite(price) ||
    !playbook
  ) {
    return fallbackInsights(item.beginnerTip, "sparkles");
  }

  const { support, resistance, automation } = playbook;
  const formattedPrice = formatNumber(price, item.format);

  if (formattedPrice === "—") {
    return fallbackInsights(item.beginnerTip, "sparkles");
  }

  const insights: InsightVisual[] = [
    createInsight(`Last trade ${formattedPrice}`, "activity", "bullish"),
  ];

  if (support !== undefined) {
    const supportInsight = buildLevelInsight(
      describeLevelProximity(price, support, "support", item.format),
      "support",
    );
    if (supportInsight) {
      insights.push(supportInsight);
    }
  }

  if (resistance !== undefined) {
    const resistanceInsight = buildLevelInsight(
      describeLevelProximity(price, resistance, "resistance", item.format),
      "resistance",
    );
    if (resistanceInsight) {
      insights.push(resistanceInsight);
    }
  }

  const changePercent = quote?.changePercent;
  const changeLabel = formatChangePercent(changePercent);
  if (changeLabel !== "—") {
    const tone: InsightTone = changePercent === undefined ||
        Number.isNaN(changePercent)
      ? "neutral"
      : changePercent < 0
      ? "bearish"
      : changePercent > 0
      ? "bullish"
      : "neutral";
    const icon = tone === "bearish" ? "alert-triangle" : "activity";
    insights.push(createInsight(`Session move ${changeLabel}`, icon, tone));
  }

  if (automation) {
    insights.push(
      createInsight(`Automation: ${automation}`, "repeat", "neutral"),
    );
  }

  return insights;
};

const selectPlanMessage = (
  playbook: StrategyPlaybook,
  changePercent: number | undefined,
) => {
  if (changePercent === undefined || Number.isNaN(changePercent)) {
    return playbook.plan.default;
  }

  const bullishTrigger = playbook.momentum?.bullish ?? 0.6;
  const bearishTrigger = playbook.momentum?.bearish ?? 0.6;

  if (changePercent >= bullishTrigger) {
    return playbook.plan.bullish;
  }
  if (changePercent <= -bearishTrigger) {
    return playbook.plan.bearish;
  }

  return playbook.plan.default;
};

const buildStrategyFocus = (
  item: MarketWatchlistItem,
  quote: MarketQuote | undefined,
): InsightVisual[] => {
  const { playbook } = item;
  if (!playbook) {
    return fallbackInsights(item.focus, "target");
  }

  const changePercent = quote?.changePercent;
  const changeLabel = formatChangePercent(changePercent);
  const rangeLabel = formatRange(quote, item.format);
  const planMessage = collapseWhitespace(
    selectPlanMessage(playbook, changePercent),
  );

  const insights: InsightVisual[] = [];

  if (changeLabel !== "—") {
    const tone: InsightTone = changePercent === undefined ||
        Number.isNaN(changePercent)
      ? "neutral"
      : changePercent < 0
      ? "bearish"
      : changePercent > 0
      ? "bullish"
      : "neutral";
    const icon = tone === "bearish" ? "alert-triangle" : "activity";
    insights.push(createInsight(`Momentum ${changeLabel}`, icon, tone));
  }

  if (rangeLabel !== "—") {
    insights.push(createInsight(`Range ${rangeLabel}`, "grid", "neutral"));
  }

  if (planMessage) {
    insights.push(createInsight(`Plan: ${planMessage}`, "target", "bullish"));
  }

  if (playbook.flipLevel !== undefined) {
    const flipLabel = formatNumber(playbook.flipLevel, item.format);
    if (flipLabel !== "—") {
      insights.push(
        createInsight(`Flip level ${flipLabel}`, "flag", "bullish"),
      );
    }
  }

  if (playbook.automation) {
    insights.push(
      createInsight(`Automation: ${playbook.automation}`, "repeat", "neutral"),
    );
  }

  return insights;
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseTimestamp = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const computeDxyQuote = (
  quotes: Record<string, MarketQuote>,
): MarketQuote | undefined => {
  const base = 50.14348112;
  let last = base;
  let high = base;
  let low = base;
  let changeDecimal = 0;

  for (const { instrumentId, exponent } of DXY_COMPOSITION) {
    const quote = quotes[instrumentId];
    if (!quote) {
      return undefined;
    }

    const rate = quote.last;
    const highRate = exponent >= 0 ? quote.high : quote.low;
    const lowRate = exponent >= 0 ? quote.low : quote.high;

    if (
      rate === undefined ||
      highRate === undefined ||
      lowRate === undefined ||
      !Number.isFinite(rate) ||
      !Number.isFinite(highRate) ||
      !Number.isFinite(lowRate)
    ) {
      return undefined;
    }

    last *= Math.pow(rate, exponent);
    high *= Math.pow(highRate, exponent);
    low *= Math.pow(lowRate, exponent);
    changeDecimal += exponent * (quote.changePercent / 100);
  }

  const computedHigh = Math.max(high, low);
  const computedLow = Math.min(high, low);

  if (
    !Number.isFinite(last) || !Number.isFinite(computedHigh) ||
    !Number.isFinite(computedLow)
  ) {
    return undefined;
  }

  return {
    last,
    high: computedHigh,
    low: computedLow,
    changePercent: changeDecimal * 100,
  };
};

const loadMarketQuotes = async (
  signal?: AbortSignal,
): Promise<
  { quotes: Record<string, MarketQuote>; lastUpdated: Date | null }
> => {
  const response = await fetch(MARKET_ENDPOINT, { cache: "no-store", signal });

  if (!response.ok) {
    throw new Error(`Failed to fetch market data (${response.status})`);
  }

  const payload = (await response.json()) as MarketApiResponse;
  const quotes: Record<string, MarketQuote> = {};
  let latestTimestamp: number | undefined;

  for (const [key, value] of Object.entries(payload)) {
    const last = parseNumber(value.bid);
    const changePercent = parseNumber(value.pctChange);
    const high = parseNumber(value.high);
    const low = parseNumber(value.low);

    if (
      last === undefined ||
      changePercent === undefined ||
      high === undefined ||
      low === undefined
    ) {
      continue;
    }

    quotes[key] = {
      last,
      changePercent,
      high,
      low,
    };

    const timestamp = parseTimestamp(value.create_date);
    if (timestamp !== undefined) {
      latestTimestamp = latestTimestamp
        ? Math.max(latestTimestamp, timestamp)
        : timestamp;
    }
  }

  const dxy = computeDxyQuote(quotes);
  if (dxy) {
    quotes.DXY = dxy;
  }

  return {
    quotes,
    lastUpdated: latestTimestamp ? new Date(latestTimestamp) : null,
  };
};

const getStatusLabel = (updatedAt: Date | null, isFetching: boolean) => {
  if (!updatedAt && isFetching) {
    return "Fetching live prices…";
  }
  if (isFetching) {
    return "Syncing live prices…";
  }
  if (updatedAt) {
    return `Synced ${formatIsoTime(updatedAt)}`;
  }
  return "Waiting for live feed…";
};

export function MarketWatchlist() {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [hasViewportEntry, setHasViewportEntry] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden
  );

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsInViewport(true);
      setHasViewportEntry(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry) {
          setIsInViewport(entry.isIntersecting);
          setHasViewportEntry(true);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const shouldPollViewport = hasViewportEntry ? isInViewport : true;
  const isActive = shouldPollViewport && isDocumentVisible;

  const refreshQuotes = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    if (isMountedRef.current) {
      setIsFetching(true);
    }

    try {
      const { quotes: latestQuotes, lastUpdated } = await loadMarketQuotes(
        controller.signal,
      );
      if (!isMountedRef.current) {
        return;
      }
      setQuotes(latestQuotes);
      setUpdatedAt(lastUpdated ?? new Date());
      setError(null);
    } catch (fetchError) {
      if (
        fetchError instanceof DOMException && fetchError.name === "AbortError"
      ) {
        return;
      }
      if (isMountedRef.current) {
        setError(
          "Unable to sync live prices right now. We will retry automatically.",
        );
      }
    } finally {
      inFlightRef.current = false;
      abortControllerRef.current = null;
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      return;
    }

    abortControllerRef.current?.abort();
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void refreshQuotes();
    const intervalId = setInterval(() => {
      void refreshQuotes();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, refreshQuotes]);

  const statusLabel = useMemo(() => {
    if (!isDocumentVisible) {
      return "Updates paused (tab inactive)";
    }
    if (hasViewportEntry && !isInViewport) {
      return "Scroll to load live prices";
    }
    return getStatusLabel(updatedAt, isFetching);
  }, [
    hasViewportEntry,
    isInViewport,
    isDocumentVisible,
    updatedAt,
    isFetching,
  ]);

  return (
    <Column
      ref={sectionRef}
      id="market-watchlist"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="16" maxWidth={32}>
        <Heading variant="display-strong-xs">Live market watchlist</Heading>
        <Column gap="8">
          <Text variant="body-default-l" onBackground="neutral-weak">
            New to the markets? Start with the quick takeaways in each card. We
            refresh prices automatically so you always see the latest levels the
            desk is working with.
          </Text>
          <Row gap="8" wrap>
            <Tag size="s" prefixIcon="clock">Maldives Time (MVT)</Tag>
            <Tag size="s" prefixIcon="repeat">Updates every 60 seconds</Tag>
          </Row>
        </Column>
        <Row gap="8" vertical="center" wrap>
          <Tag size="s">{statusLabel}</Tag>
          {error
            ? (
              <Text
                variant="label-default-s"
                style={{ color: balanceTextColor("bearish") }}
              >
                {error}
              </Text>
            )
            : null}
        </Row>
      </Column>
      <div
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {WATCHLIST.map((item) => {
          const category = CATEGORY_DETAILS[item.category];
          const bias = BIAS_DETAILS[item.bias];
          const quote = quotes[item.dataKey];
          const changeValue = quote?.changePercent;
          const changePositive = changeValue !== undefined
            ? changeValue >= 0
            : undefined;
          const quickTakeaway = buildQuickTakeaway(item, quote);
          const strategyFocus = buildStrategyFocus(item, quote);
          const biasTone = bias.tone;
          const biasClassName = biasTone
            ? balanceToneClass(biasTone)
            : undefined;
          const biasBackground = biasTone
            ? undefined
            : bias.fallbackBackground ?? "neutral-alpha-weak";
          const biasForeground = biasTone
            ? undefined
            : bias.fallbackOnBackground ?? "neutral-strong";
          const changeTone: BalanceTone | undefined =
            changePositive === undefined
              ? undefined
              : changePositive
              ? "bullish"
              : "bearish";
          const changeClassName = changeTone
            ? balanceToneClass(changeTone)
            : undefined;
          const changeBackground = changeTone
            ? undefined
            : "neutral-alpha-weak";
          const changeForeground = changeTone ? undefined : "neutral-strong";

          return (
            <Column
              key={item.symbol}
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="16"
              style={{ minWidth: "280px", scrollSnapAlign: "start" }}
            >
              <Row
                horizontal="between"
                vertical="center"
                gap="12"
                s={{ direction: "column", align: "start" }}
              >
                <Column gap="8">
                  <Row gap="8" vertical="center" wrap>
                    <Heading variant="heading-strong-m">
                      {item.displaySymbol}
                    </Heading>
                    <Tag size="s" prefixIcon={category.icon}>
                      {category.label}
                    </Tag>
                    <Tag
                      size="s"
                      className={biasClassName}
                      background={biasBackground}
                      onBackground={biasTone ? undefined : biasForeground}
                    >
                      {bias.label}
                    </Tag>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {item.name}
                  </Text>
                </Column>
                <Column gap="8" horizontal="end" align="end">
                  <Row gap="12" vertical="center">
                    <Text variant="heading-strong-m" align="right">
                      {formatNumber(quote?.last, item.format)}
                    </Text>
                    <Tag
                      size="s"
                      className={changeClassName}
                      background={changeBackground}
                      onBackground={changeTone ? undefined : changeForeground}
                    >
                      {formatChangePercent(changeValue)}
                    </Tag>
                  </Row>
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-weak"
                    align="right"
                  >
                    24h change
                  </Text>
                </Column>
              </Row>
              <Line background="neutral-alpha-weak" />
              <Row gap="16" wrap>
                <Column minWidth={16} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Session focus
                  </Text>
                  <Tag size="s" prefixIcon="sparkles">
                    {item.session}
                  </Tag>
                </Column>
                <Column minWidth={16} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Intraday range
                  </Text>
                  <Text variant="body-default-m">
                    {formatRange(quote, item.format)}
                  </Text>
                </Column>
                <Column
                  flex={1}
                  minWidth={24}
                  gap="8"
                  className={balanceToneClass("premium")}
                  padding="m"
                  radius="m"
                >
                  <Text variant="label-default-s">
                    Quick takeaway
                  </Text>
                  <Column gap="4">
                    {quickTakeaway.length > 0
                      ? quickTakeaway.map((insight, index) => {
                        const tone = INSIGHT_TONE_STYLES[insight.tone];
                        const toneClassName = tone.tone
                          ? balanceToneClass(tone.tone)
                          : undefined;
                        const toneBackground = tone.tone
                          ? undefined
                          : tone.fallbackBackground ?? "neutral-alpha-weak";
                        const toneIcon = tone.tone
                          ? undefined
                          : tone.fallbackIcon ?? "neutral-medium";
                        const toneText = tone.tone
                          ? undefined
                          : tone.fallbackText ?? "neutral-strong";
                        return (
                          <Row
                            key={`${item.symbol}-takeaway-${index}`}
                            className={toneClassName}
                            background={toneBackground}
                            radius="s"
                            padding="s"
                            gap="8"
                            vertical="center"
                          >
                            <Icon
                              name={insight.icon}
                              onBackground={toneIcon}
                            />
                            <Text
                              variant="body-default-s"
                              onBackground={toneText}
                            >
                              {insight.label}
                            </Text>
                          </Row>
                        );
                      })
                      : (
                        <Text
                          variant="body-default-s"
                          style={{ color: balanceTextColor("premium") }}
                        >
                          No quick insights available.
                        </Text>
                      )}
                  </Column>
                </Column>
                <Column
                  flex={1}
                  minWidth={24}
                  gap="8"
                  className={balanceToneClass("discount")}
                  padding="m"
                  radius="m"
                >
                  <Text variant="label-default-s">
                    Strategy focus
                  </Text>
                  <Column gap="4">
                    {strategyFocus.length > 0
                      ? strategyFocus.map((insight, index) => {
                        const tone = INSIGHT_TONE_STYLES[insight.tone];
                        const toneClassName = tone.tone
                          ? balanceToneClass(tone.tone)
                          : undefined;
                        const toneBackground = tone.tone
                          ? undefined
                          : tone.fallbackBackground ?? "neutral-alpha-weak";
                        const toneIcon = tone.tone
                          ? undefined
                          : tone.fallbackIcon ?? "neutral-medium";
                        const toneText = tone.tone
                          ? undefined
                          : tone.fallbackText ?? "neutral-strong";
                        return (
                          <Row
                            key={`${item.symbol}-strategy-${index}`}
                            className={toneClassName}
                            background={toneBackground}
                            radius="s"
                            padding="s"
                            gap="8"
                            vertical="center"
                          >
                            <Icon
                              name={insight.icon}
                              onBackground={toneIcon}
                            />
                            <Text
                              variant="body-default-m"
                              onBackground={toneText}
                            >
                              {insight.label}
                            </Text>
                          </Row>
                        );
                      })
                      : (
                        <Text variant="body-default-m">No focus guidance.</Text>
                      )}
                  </Column>
                </Column>
              </Row>
            </Column>
          );
        })}
      </div>
      <Text variant="body-default-s" onBackground="neutral-weak">
        Quotes stream from AwesomeAPI and refresh every 60 seconds while you
        keep this dashboard open. Guidance updates alongside each global session
        so execution, automation triggers, and risk adjustments stay aligned
        with the desk.
      </Text>
    </Column>
  );
}

export default MarketWatchlist;
