"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Column,
  Heading,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import type { IconName } from "@/resources/icons";
import { formatIsoTime } from "@/utils/isoFormat";

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
  background: `${"brand" | "danger" | "neutral"}-alpha-${"weak" | "medium"}`;
  onBackground: `${"brand" | "danger" | "neutral"}-${
    | "weak"
    | "medium"
    | "strong"}`;
};

type CategoryVisual = {
  icon: IconName;
  label: string;
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
  Long: {
    label: "Long bias",
    background: "brand-alpha-weak",
    onBackground: "brand-strong",
  },
  Short: {
    label: "Short bias",
    background: "danger-alpha-weak",
    onBackground: "danger-strong",
  },
  Monitoring: {
    label: "Monitoring",
    background: "neutral-alpha-weak",
    onBackground: "neutral-strong",
  },
};

const WATCHLIST: MarketWatchlistItem[] = [
  {
    symbol: "XAUUSD",
    displaySymbol: "XAU/USD",
    name: "Spot gold",
    category: "Metals",
    session: "Asia accumulation",
    focus:
      "Risk-off flows keep gold bid; running partial hedge overlay with alerts for a break of $2,400 support to flip defensive.",
    beginnerTip:
      "Gold is the safety trade. We stay cautious if price slips under $2,400 and look for steadier moves before adding risk.",
    bias: "Monitoring",
    dataKey: "XAUUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
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
    symbol: "DXY",
    displaySymbol: "DXY",
    name: "US Dollar Index",
    category: "Indices",
    session: "Global dollar flows",
    focus:
      "Watching rate expectations and Treasury auctions for momentum cues. Dollar strength keeps risk desks defensive on global beta.",
    beginnerTip:
      "When the dollar index rises, other currencies and risk assets usually cool off. Strong DXY means scale position sizes down.",
    bias: "Long",
    dataKey: "DXY",
    format: {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
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
    symbol: "USDJPY",
    displaySymbol: "USD/JPY",
    name: "US dollar vs Japanese yen",
    category: "FX",
    session: "Tokyo carry unwind",
    focus:
      "Tracking MoF rhetoric and US yields for timing on fresh shorts. Alerted automation for spikes sub 147.00 as risk trigger.",
    beginnerTip:
      "A falling USD/JPY means the yen is getting stronger. Quick drops toward 147 are our cue to slow down and reassess entries.",
    bias: "Monitoring",
    dataKey: "USDJPY",
    format: {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
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
    symbol: "GBPUSD",
    displaySymbol: "GBP/USD",
    name: "British pound vs US dollar",
    category: "FX",
    session: "London spot flow",
    focus:
      "Watching BoE commentary and US data for continuation shorts while price is capped below key weekly supply near 1.36.",
    beginnerTip:
      "Sellers stay in control while GBP/USD holds below 1.36. Keep any long ideas small and respect the broader downtrend.",
    bias: "Short",
    dataKey: "GBPUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    },
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
    symbol: "BTCUSD",
    displaySymbol: "BTC/USD",
    name: "Bitcoin spot",
    category: "Crypto",
    session: "London momentum",
    focus:
      "Scaling automation on the $64k breakout shelf while funding stays balanced. Monitoring for exhaustion near $66k liquidity.",
    beginnerTip:
      "Bitcoin pushing above $64k keeps bullish momentum alive, but we plan exits near $66k in case buyers tire out.",
    bias: "Long",
    dataKey: "BTCUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
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
    symbol: "ETHUSD",
    displaySymbol: "ETH/USD",
    name: "Ether spot",
    category: "Crypto",
    session: "US overlap",
    focus:
      "Looking for acceptance above $3.1k to continue the weekly trend. Mentors tightening invalidation beneath $2.95k swing lows.",
    beginnerTip:
      "Ether needs to hold above $3.1k to confirm the uptrend. Below $2.95k we step aside and wait for clarity.",
    bias: "Long",
    dataKey: "ETHUSD",
    format: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
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

const MARKET_CODES = [
  "XAU-USD",
  "GBP-USD",
  "USD-JPY",
  "EUR-USD",
  "USD-CAD",
  "USD-SEK",
  "USD-CHF",
  "BTC-USD",
  "ETH-USD",
];

const DXY_COMPOSITION: Array<{ key: string; exponent: number }> = [
  { key: "EURUSD", exponent: -0.576 },
  { key: "USDJPY", exponent: 0.136 },
  { key: "GBPUSD", exponent: -0.119 },
  { key: "USDCAD", exponent: 0.091 },
  { key: "USDSEK", exponent: 0.042 },
  { key: "USDCHF", exponent: 0.036 },
];

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

const buildQuickTakeaway = (
  item: MarketWatchlistItem,
  quote: MarketQuote | undefined,
) => {
  const price = quote?.last;
  const { playbook } = item;

  if (
    price === undefined ||
    !Number.isFinite(price) ||
    !playbook
  ) {
    return item.beginnerTip;
  }

  const { support, resistance, automation } = playbook;
  const formattedPrice = formatNumber(price, item.format);

  if (formattedPrice === "—") {
    return item.beginnerTip;
  }

  const guidance: string[] = [`Last trade ${formattedPrice}.`];

  if (support !== undefined) {
    const supportInsight = describeLevelProximity(
      price,
      support,
      "support",
      item.format,
    );
    if (supportInsight) {
      guidance.push(supportInsight);
    }
  }

  if (resistance !== undefined) {
    const resistanceInsight = describeLevelProximity(
      price,
      resistance,
      "resistance",
      item.format,
    );
    if (resistanceInsight) {
      guidance.push(resistanceInsight);
    }
  }

  const changeLabel = formatChangePercent(quote?.changePercent);
  if (changeLabel !== "—") {
    guidance.push(`Session move ${changeLabel}.`);
  }

  if (automation) {
    guidance.push(automation);
  }

  return guidance.join(" ");
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
) => {
  const { playbook } = item;
  if (!playbook) {
    return item.focus;
  }

  const changeLabel = formatChangePercent(quote?.changePercent);
  const rangeLabel = formatRange(quote, item.format);
  const planMessage = selectPlanMessage(playbook, quote?.changePercent);

  const segments: string[] = [];

  if (changeLabel !== "—") {
    segments.push(`Momentum ${changeLabel}.`);
  }
  if (rangeLabel !== "—") {
    segments.push(`Intraday range ${rangeLabel}.`);
  }

  segments.push(planMessage);

  if (playbook.flipLevel !== undefined) {
    const flipLabel = formatNumber(playbook.flipLevel, item.format);
    if (flipLabel !== "—") {
      segments.push(`Flip level ${flipLabel}.`);
    }
  }

  segments.push(`Automation note: ${playbook.automation}`);

  return segments.join(" ");
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

  for (const { key, exponent } of DXY_COMPOSITION) {
    const quote = quotes[key];
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
              <Text variant="label-default-s" onBackground="danger-strong">
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
          const changeBackground = changePositive === undefined
            ? "neutral-alpha-weak"
            : changePositive
            ? "brand-alpha-weak"
            : "danger-alpha-weak";
          const changeForeground = changePositive === undefined
            ? "neutral-strong"
            : changePositive
            ? "brand-strong"
            : "danger-strong";

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
                      background={bias.background}
                      onBackground={bias.onBackground}
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
                      background={changeBackground}
                      onBackground={changeForeground}
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
                  background="brand-alpha-weak"
                  padding="m"
                  radius="m"
                >
                  <Text variant="label-default-s" onBackground="brand-strong">
                    Quick takeaway
                  </Text>
                  <Text variant="body-default-s" onBackground="brand-strong">
                    {quickTakeaway}
                  </Text>
                </Column>
                <Column flex={1} minWidth={24} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Strategy focus
                  </Text>
                  <Text variant="body-default-m">{strategyFocus}</Text>
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
