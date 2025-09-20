import { Column, Heading, Line, Row, Tag, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";

interface MarketWatchlistItem {
  symbol: string;
  name: string;
  category: InstrumentCategory;
  last: string;
  changePercent: number;
  range: string;
  session: string;
  focus: string;
  bias: "Long" | "Short" | "Monitoring";
}

type InstrumentCategory = "Crypto" | "FX" | "Metals" | "Indices";

type BiasVisual = {
  label: string;
  background: `${"brand" | "danger" | "neutral"}-alpha-${"weak" | "medium"}`;
  onBackground: `${"brand" | "danger" | "neutral"}-${"weak" | "medium" | "strong"}`;
};

type CategoryVisual = {
  icon: IconName;
  label: string;
};

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
    symbol: "BTC/USDT",
    name: "Bitcoin perpetual futures",
    category: "Crypto",
    last: "$64,830",
    changePercent: 2.35,
    range: "$63,120 – $65,480",
    session: "London momentum",
    focus:
      "Scaling automation on the $64k breakout shelf while funding stays balanced. Monitoring for exhaustion near $66k liquidity.",
    bias: "Long",
  },
  {
    symbol: "ETH/USDT",
    name: "Ether perpetual futures",
    category: "Crypto",
    last: "$3,120",
    changePercent: 1.12,
    range: "$3,020 – $3,180",
    session: "US overlap",
    focus:
      "Looking for acceptance above $3.1k to continue the weekly trend. Mentors tightening invalidation beneath $2.95k swing low.",
    bias: "Long",
  },
  {
    symbol: "XAU/USD",
    name: "Spot gold",
    category: "Metals",
    last: "$2,432",
    changePercent: 0.74,
    range: "$2,410 – $2,448",
    session: "Asia accumulation",
    focus:
      "Risk-off flows keep gold bid; running partial hedge overlay with alerts for a break of $2,400 support to flip defensive.",
    bias: "Monitoring",
  },
  {
    symbol: "EUR/USD",
    name: "Euro vs US dollar",
    category: "FX",
    last: "1.0785",
    changePercent: -0.42,
    range: "1.0720 – 1.0840",
    session: "NY reversal",
    focus:
      "Tracking DXY strength for continuation shorts while price remains capped under 1.0820. Watching ECB commentary for catalysts.",
    bias: "Short",
  },
  {
    symbol: "SPX",
    name: "S&P 500 index futures",
    category: "Indices",
    last: "5,320",
    changePercent: 0.58,
    range: "5,268 – 5,342",
    session: "US open drive",
    focus:
      "Monitoring breakout to cycle highs with reduced hedge overlay. Will reload protection if breadth fades into the close.",
    bias: "Monitoring",
  },
  {
    symbol: "SOL/USDT",
    name: "Solana perpetual futures",
    category: "Crypto",
    last: "$148.20",
    changePercent: -1.35,
    range: "$142.00 – $153.80",
    session: "Asia rotation",
    focus:
      "Waiting for reclaim of the $150 pivot before re-engaging size. Desk automation keeping exposure light until structure resets.",
    bias: "Short",
  },
];

const formatChangePercent = (value: number) => {
  const absolute = Math.abs(value).toFixed(2);
  if (value > 0) {
    return `+${absolute}%`;
  }
  if (value < 0) {
    return `-${absolute}%`;
  }
  return `${absolute}%`;
};

export function MarketWatchlist() {
  return (
    <Column
      id="market-watchlist"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">Live market watchlist</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Instruments the desk is actively briefing members on. Values blend exchange data with mentor guidance so you can plan
          risk in sync with the trade desk.
        </Text>
      </Column>
      <Column gap="16">
        {WATCHLIST.map((item) => {
          const category = CATEGORY_DETAILS[item.category];
          const bias = BIAS_DETAILS[item.bias];
          const changePositive = item.changePercent >= 0;
          return (
            <Column
              key={item.symbol}
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="16"
            >
              <Row
                horizontal="between"
                vertical="center"
                gap="12"
                s={{ direction: "column", align: "start" }}
              >
                <Column gap="8">
                  <Row gap="8" vertical="center" wrap>
                    <Heading variant="heading-strong-m">{item.symbol}</Heading>
                    <Tag size="s" prefixIcon={category.icon}>
                      {category.label}
                    </Tag>
                    <Tag size="s" background={bias.background} onBackground={bias.onBackground}>
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
                      {item.last}
                    </Text>
                    <Tag
                      size="s"
                      background={changePositive ? "brand-alpha-weak" : "danger-alpha-weak"}
                      onBackground={changePositive ? "brand-strong" : "danger-strong"}
                    >
                      {formatChangePercent(item.changePercent)}
                    </Tag>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak" align="right">
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
                  <Tag size="s" prefixIcon="timer">
                    {item.session}
                  </Tag>
                </Column>
                <Column minWidth={16} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Intraday range
                  </Text>
                  <Text variant="body-default-m">{item.range}</Text>
                </Column>
                <Column flex={1} minWidth={24} gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Desk guidance
                  </Text>
                  <Text variant="body-default-m">{item.focus}</Text>
                </Column>
              </Row>
            </Column>
          );
        })}
      </Column>
      <Text variant="body-default-s" onBackground="neutral-weak">
        Watchlist snapshots refresh with each global session change so members can line up execution, automation triggers, and
        risk adjustments in Once UI dashboards.
      </Text>
    </Column>
  );
}

export default MarketWatchlist;
