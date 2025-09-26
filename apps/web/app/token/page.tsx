import { Column, Heading, Icon, Row, Tag, Text } from "@/components/dynamic-ui-system";

const TOKEN_NAME = "Dynamic Capital Token";
const TOKEN_SYMBOL = "DCT";
const TOKEN_DECIMALS = 9;
const TOKEN_MAX_SUPPLY = 100_000_000;

const SUPPLY_SPLITS = [
  {
    label: "Operations",
    value: "60%",
    description: "Fuel day-to-day desk execution, analytics, and mentor coverage.",
    icon: "sparkles" as const,
  },
  {
    label: "Auto-invest pool",
    value: "30%",
    description: "Deploy liquidity into strategies the desk validates each epoch.",
    icon: "rocket" as const,
  },
  {
    label: "Buyback & burn",
    value: "10%",
    description: "Stabilize the treasury with scheduled market operations and burns.",
    icon: "repeat" as const,
  },
] as const;

const LOCK_TIERS = [
  {
    tier: "Bronze",
    duration: "3 months",
    multiplier: "1.2×",
    description: "Starter tier that unlocks curated market briefs and limited drops.",
  },
  {
    tier: "Silver",
    duration: "6 months",
    multiplier: "1.5×",
    description: "Enhance reward flow with priority access to automation templates.",
  },
  {
    tier: "Gold",
    duration: "12 months",
    multiplier: "2.0×",
    description: "Max utility with VIP desk passes, mentor escalations, and beta slots.",
  },
] as const;

const TOKEN_UTILITIES = [
  "Redeem on-chain for VIP membership credits and automation boosts.",
  "Stake into the auto-invest pool to participate in weekly performance.",
  "Vote on treasury moves through the 48-hour guarded governance window.",
] as const;

const DEX_POOLS = [
  {
    dex: "STON.fi",
    pair: "DCT/USDT",
    url: "https://app.ston.fi/swap?from=USDT&to=DCT",
    description:
      "Anchor the treasury's USD peg with a stablecoin pool that supports fiat settlements and OTC conversions.",
  },
  {
    dex: "DeDust",
    pair: "DCT/TON",
    url: "https://dedust.io/swap/TON-DCT",
    description:
      "Route native TON liquidity for buybacks, burns, and member swaps directly against the treasury's base asset.",
  },
] as const;

export const metadata = {
  title: "Dynamic Capital Token (DCT)",
  description:
    "Explore the Dynamic Capital Token utility, distribution, and staking tiers powering the trading desk ecosystem.",
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

export default function TokenPage() {
  return (
    <Column
      gap="40"
      paddingY="48"
      paddingX="16"
      align="center"
      horizontal="center"
      fillWidth
    >
      <Column maxWidth={32} gap="12" align="center" horizontal="center">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="shield">
          Treasury utility
        </Tag>
        <Heading variant="display-strong-s" align="center">
          {TOKEN_NAME} ({TOKEN_SYMBOL})
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-weak" align="center">
          The membership currency that powers Dynamic Capital automations, treasury
          governance, and community rewards.
        </Text>
        <Row gap="16" wrap horizontal="center">
          <Row
            gap="8"
            background="page"
            border="neutral-alpha-medium"
            radius="l"
            padding="12"
            vertical="center"
          >
            <Icon name="infinity" onBackground="brand-medium" />
            <Text variant="label-strong-s">Max supply {formatNumber(TOKEN_MAX_SUPPLY)}</Text>
          </Row>
          <Row
            gap="8"
            background="page"
            border="neutral-alpha-medium"
            radius="l"
            padding="12"
            vertical="center"
          >
            <Icon name="sparkles" onBackground="brand-medium" />
            <Text variant="label-strong-s">Decimals {TOKEN_DECIMALS}</Text>
          </Row>
        </Row>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Utility in motion</Heading>
        <Column gap="16" as="ul">
          {TOKEN_UTILITIES.map((utility) => (
            <Row
              key={utility}
              gap="12"
              as="li"
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="16"
              vertical="center"
            >
              <Icon name="check" onBackground="brand-medium" />
              <Text variant="body-default-m" onBackground="neutral-weak">
                {utility}
              </Text>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Supply allocation</Heading>
        <Column gap="16">
          {SUPPLY_SPLITS.map((split) => (
            <Row
              key={split.label}
              gap="16"
              background="page"
              border="neutral-alpha-medium"
              radius="l"
              padding="20"
              s={{ direction: "column" }}
            >
              <Row gap="12" vertical="center">
                <Icon name={split.icon} onBackground="brand-medium" />
                <Heading variant="heading-strong-m">{split.label}</Heading>
                <Tag size="s" background="brand-alpha-weak">
                  {split.value}
                </Tag>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {split.description}
              </Text>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Lock tiers & multipliers</Heading>
        <Column gap="16">
          {LOCK_TIERS.map((tier) => (
            <Row
              key={tier.tier}
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="20"
              horizontal="between"
              vertical="center"
              s={{ direction: "column", align: "start" }}
            >
              <Column gap="8">
                <Row gap="8" vertical="center">
                  <Heading variant="heading-strong-m">{tier.tier}</Heading>
                  <Tag size="s" background="neutral-alpha-weak">
                    {tier.duration}
                  </Tag>
                  <Tag size="s" background="brand-alpha-weak">
                    {tier.multiplier}
                  </Tag>
                </Row>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {tier.description}
                </Text>
              </Column>
            </Row>
          ))}
        </Column>
      </Column>

      <Column gap="24" maxWidth={40} fillWidth>
        <Heading variant="heading-strong-l">Active DEX pools</Heading>
        <Column gap="16">
          {DEX_POOLS.map((pool) => (
            <Row
              key={pool.pair}
              gap="16"
              background="surface"
              border="neutral-alpha-medium"
              radius="l"
              padding="20"
              s={{ direction: "column" }}
            >
              <Column gap="12" fillWidth>
                <Row gap="12" vertical="center" wrap>
                  <Icon name="repeat" onBackground="brand-medium" />
                  <Heading variant="heading-strong-m">{pool.pair}</Heading>
                  <Tag size="s" background="brand-alpha-weak">
                    {pool.dex}
                  </Tag>
                </Row>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {pool.description}
                </Text>
                <Text variant="label-default-s" onBackground="brand-medium">
                  {pool.url}
                </Text>
              </Column>
            </Row>
          ))}
        </Column>
      </Column>
    </Column>
  );
}
