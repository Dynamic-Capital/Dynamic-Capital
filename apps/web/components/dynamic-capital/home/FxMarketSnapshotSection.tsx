import { Column, Heading, Line, Row, Tag, Text } from "@once-ui-system/core";
import type { Colors } from "@once-ui-system/core";

type CurrencyStrength = {
  code: string;
  rank: number;
  tone: "strong" | "balanced" | "soft";
  summary: string;
};

type TopMover = {
  symbol: string;
  pair: string;
  changePercent: number;
  change: number;
  pips: number;
  lastPrice: number;
};

type CurrencyVolatility = {
  code: string;
  rank: number;
  summary: string;
};

type VolatilityPair = {
  symbol: string;
  pair: string;
  rangePercent: number;
};

type TagBackground = Colors | "page" | "surface" | "overlay" | "transparent";

const LAST_UPDATED = "25 September 2025 · 06:28 GMT+5";

const CURRENCY_STRENGTH_METER: CurrencyStrength[] = [
  {
    code: "JPY",
    rank: 1,
    tone: "strong",
    summary:
      "Yen strength is evident with NZD/JPY (-0.17%) and USD/JPY (-0.11%) sliding on the session.",
  },
  {
    code: "AUD",
    rank: 2,
    tone: "strong",
    summary:
      "AUD is bid broadly with AUD/NZD (+0.12%), AUD/USD (+0.08%), and AUD/CAD (+0.05%) topping the gainers list.",
  },
  {
    code: "EUR",
    rank: 3,
    tone: "strong",
    summary:
      "EUR outperforms higher-beta peers as EUR/NZD prints the largest advance at +0.12%.",
  },
  {
    code: "CHF",
    rank: 4,
    tone: "balanced",
    summary:
      "CHF holds mid-pack; NZD/CHF (-0.10%) weakness keeps the franc supported versus antipodeans.",
  },
  {
    code: "CAD",
    rank: 5,
    tone: "balanced",
    summary:
      "CAD trades steady—losses to AUD are offset by NZD/CAD (-0.12%) pressure favouring the loonie.",
  },
  {
    code: "GBP",
    rank: 6,
    tone: "soft",
    summary:
      "GBP momentum is mixed: GBP/NZD still climbs (+0.05%) while GBP/JPY (-0.09%) tracks yen strength.",
  },
  {
    code: "USD",
    rank: 7,
    tone: "soft",
    summary:
      "USD slips as USD/JPY drops -0.11% and AUD/USD adds +0.08%, reflecting softer dollar demand.",
  },
  {
    code: "NZD",
    rank: 8,
    tone: "soft",
    summary:
      "NZD is the clear laggard with NZD crosses leading decliners, including NZD/JPY (-0.17%) and NZD/CAD (-0.12%).",
  },
];

const TOP_GAINERS: TopMover[] = [
  {
    symbol: "EURNZD",
    pair: "EUR/NZD",
    changePercent: 0.12,
    change: 0.0025,
    pips: 25.0,
    lastPrice: 2.02068,
  },
  {
    symbol: "AUDNZD",
    pair: "AUD/NZD",
    changePercent: 0.12,
    change: 0.00137,
    pips: 13.7,
    lastPrice: 1.13365,
  },
  {
    symbol: "AUDUSD",
    pair: "AUD/USD",
    changePercent: 0.08,
    change: 0.000525,
    pips: 5.2,
    lastPrice: 0.658875,
  },
  {
    symbol: "GBPNZD",
    pair: "GBP/NZD",
    changePercent: 0.05,
    change: 0.001255,
    pips: 12.6,
    lastPrice: 2.314215,
  },
  {
    symbol: "AUDCAD",
    pair: "AUD/CAD",
    changePercent: 0.05,
    change: 0.00048,
    pips: 4.8,
    lastPrice: 0.915295,
  },
];

const TOP_LOSERS: TopMover[] = [
  {
    symbol: "NZDJPY",
    pair: "NZD/JPY",
    changePercent: -0.17,
    change: -0.151,
    pips: -15.1,
    lastPrice: 86.436,
  },
  {
    symbol: "NZDCAD",
    pair: "NZD/CAD",
    changePercent: -0.12,
    change: -0.000975,
    pips: -9.7,
    lastPrice: 0.807385,
  },
  {
    symbol: "USDJPY",
    pair: "USD/JPY",
    changePercent: -0.11,
    change: -0.17,
    pips: -17.0,
    lastPrice: 148.716,
  },
  {
    symbol: "NZDCHF",
    pair: "NZD/CHF",
    changePercent: -0.1,
    change: -0.000465,
    pips: -4.6,
    lastPrice: 0.461945,
  },
  {
    symbol: "GBPJPY",
    pair: "GBP/JPY",
    changePercent: -0.09,
    change: -0.171,
    pips: -17.1,
    lastPrice: 200.041,
  },
];

const CURRENCY_VOLATILITY_METER: CurrencyVolatility[] = [
  {
    code: "JPY",
    rank: 1,
    summary:
      "Leads realized swings with both NZD/JPY and USD/JPY featuring among the day’s most volatile pairs.",
  },
  {
    code: "AUD",
    rank: 2,
    summary:
      "AUD pairs stay active—AUD/USD and AUD/NZD register 0.21% and 0.20% ranges respectively.",
  },
  {
    code: "NZD",
    rank: 3,
    summary:
      "NZD volatility is elevated as multiple NZD crosses occupy the top mover boards.",
  },
  {
    code: "CHF",
    rank: 4,
    summary: "CHF ranges stay supported alongside softness in NZD/CHF.",
  },
  {
    code: "USD",
    rank: 5,
    summary:
      "USD price action is moderate—USD/JPY swings 0.23% but USD/CAD remains among the calmest pairs.",
  },
  {
    code: "GBP",
    rank: 6,
    summary: "GBP movement is contained outside of GBP/JPY’s 0.20% band.",
  },
  {
    code: "CAD",
    rank: 7,
    summary: "CAD sits on the quieter side with USDCAD volatility just 0.07%.",
  },
  {
    code: "EUR",
    rank: 8,
    summary: "EUR ranges are light—EUR/CAD and EUR/GBP each move only 0.06%.",
  },
];

const MOST_VOLATILE_PAIRS: VolatilityPair[] = [
  { symbol: "NZDJPY", pair: "NZD/JPY", rangePercent: 0.25 },
  { symbol: "USDJPY", pair: "USD/JPY", rangePercent: 0.23 },
  { symbol: "AUDUSD", pair: "AUD/USD", rangePercent: 0.21 },
  { symbol: "AUDNZD", pair: "AUD/NZD", rangePercent: 0.2 },
  { symbol: "GBPJPY", pair: "GBP/JPY", rangePercent: 0.2 },
];

const LEAST_VOLATILE_PAIRS: VolatilityPair[] = [
  { symbol: "EURCAD", pair: "EUR/CAD", rangePercent: 0.06 },
  { symbol: "EURGBP", pair: "EUR/GBP", rangePercent: 0.06 },
  { symbol: "USDCAD", pair: "USD/CAD", rangePercent: 0.07 },
  { symbol: "GBPCAD", pair: "GBP/CAD", rangePercent: 0.08 },
  { symbol: "EURUSD", pair: "EUR/USD", rangePercent: 0.1 },
];

const MOVERS_SECTIONS = [
  { title: "Top gainers", data: TOP_GAINERS, tone: "brand-alpha-weak" },
  { title: "Top losers", data: TOP_LOSERS, tone: "danger-alpha-weak" },
] as const satisfies Array<{
  title: string;
  data: TopMover[];
  tone: TagBackground;
}>;

const VOLATILITY_BUCKETS = [
  {
    title: "Most volatile",
    data: MOST_VOLATILE_PAIRS,
    background: "brand-alpha-weak",
  },
  {
    title: "Least volatile",
    data: LEAST_VOLATILE_PAIRS,
    background: "neutral-alpha-weak",
  },
] as const satisfies Array<{
  title: string;
  data: VolatilityPair[];
  background: TagBackground;
}>;

const toneTagBackground: Record<CurrencyStrength["tone"], TagBackground> = {
  strong: "brand-alpha-weak",
  balanced: "neutral-alpha-weak",
  soft: "danger-alpha-weak",
};

const toneLabel: Record<CurrencyStrength["tone"], string> = {
  strong: "Leadership",
  balanced: "Balanced",
  soft: "Under pressure",
};

const formatPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatChange = (value: number) => value.toFixed(4);

const formatPips = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 6,
  }).format(value);

export function FxMarketSnapshotSection() {
  return (
    <Column
      id="fx-market-snapshot"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Row gap="12" vertical="center">
          <Heading variant="display-strong-xs">FX market snapshot</Heading>
          <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
            {LAST_UPDATED}
          </Tag>
        </Row>
        <Text variant="body-default-l" onBackground="neutral-weak">
          A desk-level digest of where momentum, volatility, and cross-asset
          leadership currently sit across major currency pairs.
        </Text>
      </Column>

      <Column gap="20">
        <Column gap="12">
          <Heading as="h3" variant="heading-strong-m">
            Currency strength meter
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Ordered by intraday performance, highlighting which majors are
            driving price action right now.
          </Text>
        </Column>
        <Row gap="16" wrap>
          {CURRENCY_STRENGTH_METER.map((currency) => (
            <Column
              key={currency.code}
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="12"
              minWidth={20}
              flex={1}
            >
              <Row horizontal="between" vertical="center" gap="8">
                <Row gap="8" vertical="center">
                  <Tag size="s" background="neutral-alpha-weak">
                    #{currency.rank}
                  </Tag>
                  <Heading as="h4" variant="heading-strong-s">
                    {currency.code}
                  </Heading>
                </Row>
                <Tag size="s" background={toneTagBackground[currency.tone]}>
                  {toneLabel[currency.tone]}
                </Tag>
              </Row>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {currency.summary}
              </Text>
            </Column>
          ))}
        </Row>
      </Column>

      <Column gap="24">
        <Heading as="h3" variant="heading-strong-m">
          Top movers
        </Heading>
        <Row gap="24" wrap>
          {MOVERS_SECTIONS.map(({ title, data, tone }) => (
            <Column key={title} flex={1} minWidth={24} gap="16">
              <Column gap="8">
                <Row gap="8" vertical="center">
                  <Tag
                    size="s"
                    background={tone}
                    prefixIcon={title === "Top gainers"
                      ? "trending-up"
                      : "trending-down"}
                  >
                    {title}
                  </Tag>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Change and last price snapshots for the session.
                  </Text>
                </Row>
              </Column>
              <Column
                background="page"
                border="neutral-alpha-weak"
                radius="l"
                padding="l"
                gap="12"
              >
                <Row horizontal="between" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Pair
                  </Text>
                  <Row gap="16" vertical="center">
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Change %
                    </Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Change
                    </Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Pips
                    </Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Last
                    </Text>
                  </Row>
                </Row>
                <Line background="neutral-alpha-weak" />
                <Column gap="12">
                  {data.map((item) => (
                    <Row
                      key={item.symbol}
                      horizontal="between"
                      vertical="center"
                    >
                      <Column gap="4">
                        <Text variant="body-strong-s">{item.pair}</Text>
                        <Text
                          variant="body-default-s"
                          onBackground="neutral-weak"
                        >
                          {item.symbol}
                        </Text>
                      </Column>
                      <Row gap="16" vertical="center">
                        <Text variant="body-strong-s">
                          {formatPercent(item.changePercent)}
                        </Text>
                        <Text
                          variant="body-default-s"
                          onBackground="neutral-weak"
                        >
                          {formatChange(item.change)}
                        </Text>
                        <Text
                          variant="body-default-s"
                          onBackground="neutral-weak"
                        >
                          {formatPips(item.pips)}
                        </Text>
                        <Text
                          variant="body-default-s"
                          onBackground="neutral-weak"
                        >
                          {formatPrice(item.lastPrice)}
                        </Text>
                      </Row>
                    </Row>
                  ))}
                </Column>
              </Column>
            </Column>
          ))}
        </Row>
      </Column>

      <Column gap="24">
        <Heading as="h3" variant="heading-strong-m">
          Volatility radar
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Cross-check the day’s most active currencies and the pairs delivering
          the widest and tightest trading bands.
        </Text>
        <Row gap="24" wrap>
          <Column flex={1} minWidth={24} gap="16">
            <Column
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="12"
            >
              <Heading as="h4" variant="heading-strong-s">
                Currency volatility meter
              </Heading>
              <Column gap="12">
                {CURRENCY_VOLATILITY_METER.map((currency) => (
                  <Row key={currency.code} gap="12" vertical="start">
                    <Tag size="s" background="neutral-alpha-weak">
                      #{currency.rank}
                    </Tag>
                    <Column gap="4">
                      <Text variant="body-strong-s">{currency.code}</Text>
                      <Text
                        variant="body-default-s"
                        onBackground="neutral-weak"
                      >
                        {currency.summary}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Column>
            </Column>
          </Column>
          <Column flex={1} minWidth={24} gap="16">
            {VOLATILITY_BUCKETS.map(({ title, data, background }) => (
              <Column
                key={title}
                background="page"
                border="neutral-alpha-weak"
                radius="l"
                padding="l"
                gap="12"
              >
                <Tag size="s" background={background} prefixIcon="activity">
                  {title}
                </Tag>
                <Column gap="12">
                  {data.map((item) => (
                    <Row
                      key={item.symbol}
                      horizontal="between"
                      vertical="center"
                    >
                      <Column gap="4">
                        <Text variant="body-strong-s">{item.pair}</Text>
                        <Text
                          variant="body-default-s"
                          onBackground="neutral-weak"
                        >
                          {item.symbol}
                        </Text>
                      </Column>
                      <Text variant="body-strong-s">
                        {item.rangePercent.toFixed(2)}%
                      </Text>
                    </Row>
                  ))}
                </Column>
              </Column>
            ))}
          </Column>
        </Row>
      </Column>
    </Column>
  );
}

export default FxMarketSnapshotSection;
