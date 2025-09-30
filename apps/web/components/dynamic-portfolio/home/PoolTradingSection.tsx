import { about } from "@/resources";
import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Text,
} from "@/components/dynamic-ui-system";

const METRICS = [
  { label: "Capital guided", value: "$42M" },
  { label: "Exchanges linked", value: "17" },
  { label: "Max drawdown", value: "-8%" },
];

const FEATURES = [
  "We size each position so you never over-leverage.",
  "Daily recaps show what moved and why it mattered.",
  "Withdraw anytime a window opens—no tickets required.",
];

const SAFEGUARDS = [
  "Auto pauses kick in when limits are hit.",
  "Human checks verify the automation trail.",
  "Shared dashboards keep performance transparent.",
];

const INVESTOR_SERVICES = [
  {
    icon: "security" as const,
    copy: "Decentralized withdrawal built into the portal.",
  },
  {
    icon: "copy" as const,
    copy: "Copy trades into any linked broker or exchange.",
  },
  {
    icon: "refresh" as const,
    copy: "Recharge DCT (Dynamic Capital Tokens) in one tap.",
  },
];

export function PoolTradingSection() {
  return (
    <Column
      id="pool-trading"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">
          Pool trading made easy
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Add capital, follow along, or copy trades into your own platform. The
          desk stays simple for investors, traders, and learners.
        </Text>
      </Column>
      <Row gap="16" wrap>
        {METRICS.map((metric) => (
          <Column
            key={metric.label}
            flex={1}
            minWidth={16}
            background="brand-alpha-weak"
            border="brand-alpha-medium"
            radius="l"
            padding="m"
            gap="8"
          >
            <Heading variant="display-strong-xs">{metric.value}</Heading>
            <Text variant="body-default-s" onBackground="brand-weak">
              {metric.label}
            </Text>
          </Column>
        ))}
      </Row>
      <Column gap="24">
        <Column gap="12">
          <Heading variant="heading-strong-m">What you get</Heading>
          <Column as="ul" gap="8">
            {FEATURES.map((feature, index) => (
              <Row key={index} gap="8" vertical="center">
                <Icon name="check" onBackground="brand-medium" />
                <Text as="li" variant="body-default-m">
                  {feature}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
        <Column gap="12">
          <Heading variant="heading-strong-m">Built-in guardrails</Heading>
          <Column as="ul" gap="8">
            {SAFEGUARDS.map((item, index) => (
              <Row key={index} gap="8" vertical="center">
                <Icon name="shield" onBackground="brand-medium" />
                <Text as="li" variant="body-default-m">
                  {item}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
        <Column gap="12">
          <Heading variant="heading-strong-m">Investor & copier tools</Heading>
          <Column as="ul" gap="8">
            {INVESTOR_SERVICES.map((item) => (
              <Row key={item.copy} gap="8" vertical="center">
                <Icon name={item.icon} onBackground="brand-medium" />
                <Text as="li" variant="body-default-m">
                  {item.copy}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
      </Column>
      <Line background="neutral-alpha-weak" />
      <Row gap="12" s={{ direction: "column" }}>
        <Button
          size="m"
          variant="secondary"
          data-border="rounded"
          prefixIcon="coins"
          href="/checkout?plan=vip-lifetime"
        >
          Start checkout
        </Button>
        {about.calendar.display && about.calendar.link
          ? (
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              prefixIcon="calendar"
              href={about.calendar.link}
            >
              Book a quick call
            </Button>
          )
          : null}
      </Row>
    </Column>
  );
}

export default PoolTradingSection;
