"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";

import {
  Column,
  Heading,
  Icon,
  Row,
  Tag,
  Text,
  useTheme,
} from "@/components/dynamic-ui-system";
import { formatIsoTime } from "@/utils/isoFormat";

import styles from "./LiveMarketWidgets.module.scss";

type CoinGeckoAsset = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  market_cap_rank: number;
};

type YahooQuote = {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  marketState?: string;
};

type YahooQuoteResponse = {
  quoteResponse: {
    result: YahooQuote[];
  };
};

type DataState = {
  crypto: CoinGeckoAsset[];
  equities: YahooQuote[];
};

const COINGECKO_ENDPOINT =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&price_change_percentage=1h,24h";
const YAHOO_ENDPOINT =
  "https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,MSFT,SPY";
const TRADINGVIEW_SCRIPT =
  "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
const TRADINGVIEW_SYMBOL = "NASDAQ:AAPL";
const REFRESH_INTERVAL_MS = 60_000;

const numberFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const resolveChangeClassName = (value?: number | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (value > 0) {
    return styles.assetChangePositive;
  }
  if (value < 0) {
    return styles.assetChangeNegative;
  }
  return undefined;
};

const resolveChangeLabel = (value?: number | null) => {
  if (value === undefined || value === null) {
    return "—";
  }
  const formatted = percentFormatter.format(value / 100);
  return value > 0 ? `+${formatted}` : formatted;
};

const resolveMarketBadge = (marketState?: string) => {
  if (!marketState) {
    return null;
  }

  const normalized = marketState.toLowerCase();

  if (normalized.includes("pre")) {
    return { label: "Pre-market", icon: "repeat" as const };
  }

  if (normalized.includes("post")) {
    return { label: "After hours", icon: "document" as const };
  }

  return { label: "Live session", icon: "sparkles" as const };
};

const tradingViewConfig = (theme: string) => ({
  symbol: TRADINGVIEW_SYMBOL,
  width: "100%",
  height: 220,
  locale: "en",
  dateRange: "1D",
  colorTheme: theme === "dark" ? "dark" : "light",
  trendLineColor: "rgba(34, 197, 94, 1)",
  underLineColor: "rgba(34, 197, 94, 0.25)",
  isTransparent: false,
  autosize: true,
  largeChartUrl: "https://www.tradingview.com/symbols/AAPL/",
});

export function LiveMarketWidgets() {
  const { theme } = useTheme();
  const [data, setData] = useState<DataState>({ crypto: [], equities: [] });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tradingViewRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  const statusLabel = useMemo(() => {
    if (error) {
      return error;
    }
    if (isLoading) {
      return "Connecting to TradingView, CoinGecko, and Yahoo Finance…";
    }
    if (isRefreshing) {
      return "Syncing live feeds…";
    }
    if (lastUpdated) {
      return `Updated ${formatIsoTime(lastUpdated)}`;
    }
    return "Waiting for the first update…";
  }, [error, isLoading, isRefreshing, lastUpdated]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const [cryptoResponse, yahooResponse] = await Promise.all([
        fetch(COINGECKO_ENDPOINT, { cache: "no-store" }),
        fetch(YAHOO_ENDPOINT, { cache: "no-store" }),
      ]);

      if (!cryptoResponse.ok) {
        throw new Error(`CoinGecko responded with ${cryptoResponse.status}`);
      }

      if (!yahooResponse.ok) {
        throw new Error(`Yahoo Finance responded with ${yahooResponse.status}`);
      }

      const cryptoPayload = (await cryptoResponse.json()) as CoinGeckoAsset[];
      const yahooPayload = (await yahooResponse.json()) as YahooQuoteResponse;

      setData({
        crypto: cryptoPayload.slice(0, 3),
        equities: yahooPayload.quoteResponse.result.slice(0, 3),
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (refreshError) {
      console.error(refreshError);
      setError(
        "We could not refresh every feed. The dashboard will try again automatically.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!mounted) {
        return;
      }
      await refreshData();
    };

    load();
    const intervalId = window.setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [refreshData]);

  useEffect(() => {
    const container = tradingViewRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = TRADINGVIEW_SCRIPT;
    script.async = true;
    script.innerHTML = JSON.stringify(tradingViewConfig(theme));
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [theme]);

  const cardMotion = useMemo(
    () => ({
      whileHover: reduceMotion ? undefined : { y: -8, scale: 1.01 },
      transition: reduceMotion
        ? undefined
        : ({ type: "spring", stiffness: 220, damping: 20 } as const),
    }),
    [reduceMotion],
  );

  return (
    <Column fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          Live data widgets
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          One dashboard that keeps crypto, equities, and flows in sync
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          wrap="balance"
        >
          TradingView, CoinGecko, and Yahoo Finance streams power the cards
          below so you can watch price action and session context without
          leaving the desk.
        </Text>
      </Column>
      <Row className={styles.statusRow} gap="12" vertical="center">
        <Icon name="repeat" onBackground="brand-medium" />
        <Text variant="body-default-s" onBackground="neutral-weak">
          {statusLabel}
        </Text>
      </Row>
      <div className={styles.widgetGrid}>
        <motion.div
          className={styles.widgetCard}
          {...cardMotion}
        >
          <Column
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            padding="xl"
            gap="16"
            align="start"
          >
            <Row gap="12" vertical="center">
              <Icon name="rocket" onBackground="brand-medium" />
              <Heading variant="heading-strong-m">Top crypto movers</Heading>
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              CoinGecko 24h change
            </Text>
            <ul className={styles.assetList}>
              {data.crypto.length === 0
                ? (
                  <li>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Waiting for CoinGecko to deliver the latest quotes…
                    </Text>
                  </li>
                )
                : data.crypto.map((asset) => {
                  const changeValue = asset.price_change_percentage_24h;
                  const changeClassName = resolveChangeClassName(changeValue);
                  const formattedPrice = numberFormatter.format(
                    asset.current_price,
                  );
                  const formattedChange = resolveChangeLabel(changeValue);

                  return (
                    <li key={asset.id} className={styles.assetRow}>
                      <div className={styles.assetMeta}>
                        <Row gap="8" vertical="center" wrap>
                          <Tag size="s" prefixIcon="rocket">
                            {asset.symbol.toUpperCase()}
                          </Tag>
                          <Tag
                            size="s"
                            background="brand-alpha-weak"
                            onBackground="brand-strong"
                          >
                            Rank {asset.market_cap_rank ?? "—"}
                          </Tag>
                        </Row>
                        <Text variant="body-default-m">{asset.name}</Text>
                      </div>
                      <Column gap="4" horizontal="end" align="end">
                        <Text variant="heading-strong-s" align="right">
                          {formattedPrice}
                        </Text>
                        <Text
                          variant="label-default-s"
                          align="right"
                          className={changeClassName}
                        >
                          {formattedChange}
                        </Text>
                      </Column>
                    </li>
                  );
                })}
            </ul>
          </Column>
        </motion.div>
        <motion.div
          className={styles.widgetCard}
          {...cardMotion}
        >
          <Column
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            padding="xl"
            gap="16"
            align="start"
          >
            <Row gap="12" vertical="center">
              <Icon name="repeat" onBackground="brand-medium" />
              <Heading variant="heading-strong-m">US market pulse</Heading>
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Yahoo Finance spot quotes
            </Text>
            <ul className={styles.assetList}>
              {data.equities.length === 0
                ? (
                  <li>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Waiting for Yahoo Finance to sync live market data…
                    </Text>
                  </li>
                )
                : data.equities.map((quote) => {
                  const changeClassName = resolveChangeClassName(
                    quote.regularMarketChangePercent,
                  );
                  const formattedChange = resolveChangeLabel(
                    quote.regularMarketChangePercent,
                  );
                  const marketBadge = resolveMarketBadge(quote.marketState);
                  const formattedPrice = quote.regularMarketPrice === undefined
                    ? "—"
                    : numberFormatter.format(quote.regularMarketPrice);

                  return (
                    <li key={quote.symbol} className={styles.assetRow}>
                      <div className={styles.assetMeta}>
                        <Row gap="8" vertical="center" wrap>
                          <Tag size="s" prefixIcon="grid">
                            {quote.symbol}
                          </Tag>
                          {marketBadge
                            ? (
                              <Tag
                                size="s"
                                background="brand-alpha-weak"
                                prefixIcon={marketBadge.icon}
                                onBackground="brand-strong"
                              >
                                {marketBadge.label}
                              </Tag>
                            )
                            : null}
                        </Row>
                        <Text variant="body-default-m">
                          {quote.shortName ?? quote.symbol}
                        </Text>
                      </div>
                      <Column gap="4" horizontal="end" align="end">
                        <Text variant="heading-strong-s" align="right">
                          {formattedPrice}
                        </Text>
                        <Text
                          variant="label-default-s"
                          align="right"
                          className={changeClassName}
                        >
                          {formattedChange}
                        </Text>
                      </Column>
                    </li>
                  );
                })}
            </ul>
            <Row gap="8" vertical="center">
              <Icon name="document" onBackground="brand-medium" />
              <Text variant="label-default-s" onBackground="neutral-weak">
                Market cap sizes use compact USD formatting
              </Text>
            </Row>
          </Column>
        </motion.div>
        <motion.div
          className={styles.widgetCard}
          {...cardMotion}
        >
          <Column
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            padding="xl"
            gap="16"
            align="start"
          >
            <Row gap="12" vertical="center">
              <Icon name="openLink" onBackground="brand-medium" />
              <Heading variant="heading-strong-m">
                TradingView mini chart
              </Heading>
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Live AAPL structure, 1 day range
            </Text>
            <div className={styles.tradingViewContainer}>
              <div
                className="tradingview-widget-container__widget"
                ref={tradingViewRef}
              />
            </div>
            <Row gap="8" vertical="center">
              <Icon name="sparkles" onBackground="brand-medium" />
              <Text variant="label-default-s" onBackground="neutral-weak">
                Widget respects your light or dark mode preference
              </Text>
            </Row>
          </Column>
        </motion.div>
      </div>
    </Column>
  );
}
