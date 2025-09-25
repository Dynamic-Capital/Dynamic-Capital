import { about } from "@/resources";
import { Button, Column, Heading, Icon, Line, Row, Text } from "@dynamic-ui-system/core";

const METRICS = [
  { label: "Capital under management", value: "$42M" },
  { label: "Live exchanges routed", value: "17 venues" },
  { label: "Drawdown governors", value: "Automated -8% caps" },
];

const FEATURES = [
  "Automated position sizing that respects mentor-approved risk parameters",
  "Transparent pool statements with equity curves, trade logs, and allocation notes",
  "Desk operators on-call to adjust exposure when macro conditions shift",
];

const SAFEGUARDS = [
  "Per-pool circuit breakers that pause deployment when thresholds trip",
  "Human overrides with full audit trails for compliance reviews",
  "Dedicated reporting feeds for allocators and limited partners",
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
        <Heading variant="display-strong-xs">Pool trading with institutional controls</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Allocate into managed pools that blend automation and mentor oversight so capital compounds with discipline.
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
          <Heading variant="heading-strong-m">What you operate with</Heading>
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
          <Heading variant="heading-strong-m">Risk guardrails always on</Heading>
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
          Start allocation checkout
        </Button>
        {about.calendar.display && about.calendar.link ? (
          <Button
            size="m"
            variant="secondary"
            data-border="rounded"
            prefixIcon="calendar"
            href={about.calendar.link}
          >
            Schedule a pool strategy call
          </Button>
        ) : null}
      </Row>
    </Column>
  );
}

export default PoolTradingSection;
