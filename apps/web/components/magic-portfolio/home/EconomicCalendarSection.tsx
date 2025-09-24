import { Fragment } from "react";

import { Column, Heading, Icon, Line, Row, Tag, Text } from "@once-ui-system/core";

type ImpactLevel = "High" | "Medium" | "Low";

type EconomicEvent = {
  id: string;
  day: string;
  time: string;
  title: string;
  impact: ImpactLevel;
  marketFocus: string[];
  commentary: string;
  deskPlan: string[];
};

const IMPACT_STYLES: Record<ImpactLevel, { label: string; background: string; icon: string }> = {
  High: { label: "High impact", background: "danger-alpha-weak", icon: "alert-triangle" },
  Medium: { label: "Medium impact", background: "brand-alpha-weak", icon: "activity" },
  Low: { label: "Low impact", background: "neutral-alpha-weak", icon: "info" },
};

const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: "fomc",
    day: "Wed · 19 Mar",
    time: "18:00 GMT",
    title: "FOMC rate decision & Powell press conference",
    impact: "High",
    marketFocus: ["USD", "Rates", "US Indices"],
    commentary:
      "We expect the statement to keep optionality for mid-year cuts while Powell leans against premature easing. Volatility will spike across USD pairs and equity index futures.",
    deskPlan: [
      "Pause USD scalps 30 minutes before the statement and re-open only after the press conference tone is clear.",
      "Automation primed to fade S&P strength if dot plot shifts hawkish and 5,200 fails to hold on retests.",
    ],
  },
  {
    id: "uk-cpi",
    day: "Wed · 19 Mar",
    time: "07:00 GMT",
    title: "UK CPI (Feb)",
    impact: "Medium",
    marketFocus: ["GBP", "UK Rates"],
    commentary:
      "Sticky services inflation keeps the Bank of England boxed in. Consensus looks too light on core readings after energy base effects faded.",
    deskPlan: [
      "Short bias stays in place for GBP/USD below 1.28 with automation trimming risk if core prints under 5.0%.",
      "Gilts desk watching 2Y yields for a break above 4.50% to add to short-duration hedges.",
    ],
  },
  {
    id: "ecb-speeches",
    day: "Thu · 20 Mar",
    time: "09:30 GMT",
    title: "ECB speakers rotation",
    impact: "Low",
    marketFocus: ["EUR", "European Banks"],
    commentary:
      "Lagarde, Villeroy, and Schnabel hit the wires across the session. Guidance around June easing path will steer EUR crosses.",
    deskPlan: [
      "Maintain light EUR/USD short starter with adds only if commentary dismisses back-to-back cuts.",
      "Financials desk monitoring EuroStoxx banks for continuation above 130 to keep overweight exposure on.",
    ],
  },
  {
    id: "us-pmi",
    day: "Fri · 21 Mar",
    time: "13:45 GMT",
    title: "US S&P Global PMIs (Mar flash)",
    impact: "Medium",
    marketFocus: ["USD", "Commodities"],
    commentary:
      "Manufacturing prints are the swing factor for cyclical trades. A beat keeps the soft-landing narrative alive and supports metals demand.",
    deskPlan: [
      "Gold overlay hedges stay live while manufacturing PMI holds above 50; unwind if the composite slips under 49.5.",
      "Energy team watching WTI for acceptance above $80 to re-enter trend longs on solid services demand signals.",
    ],
  },
];

export function EconomicCalendarSection() {
  return (
    <Column
      id="economic-calendar"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">Upcoming economic catalysts</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          The desk tracks macro releases that can reprice risk within minutes. Each listing includes the positioning gameplan so you know how we manage exposure into and out of the data.
        </Text>
      </Column>
      <Column gap="24">
        {ECONOMIC_EVENTS.map((event, index) => {
          const impactDetails = IMPACT_STYLES[event.impact];

          return (
            <Fragment key={event.id}>
              <Column
                background="page"
                border="neutral-alpha-weak"
                radius="l"
                padding="l"
                gap="16"
              >
                <Row horizontal="between" vertical="center" gap="16" s={{ direction: "column", align: "start" }}>
                  <Column gap="8">
                    <Row gap="8" wrap>
                      <Tag size="s" background="neutral-alpha-weak" prefixIcon="calendar">
                        {event.day}
                      </Tag>
                      <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
                        {event.time}
                      </Tag>
                    </Row>
                    <Heading variant="heading-strong-m">{event.title}</Heading>
                  </Column>
                  <Tag size="s" background={impactDetails.background} prefixIcon={impactDetails.icon}>
                    {impactDetails.label}
                  </Tag>
                </Row>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {event.commentary}
                </Text>
                <Row gap="8" wrap>
                  {event.marketFocus.map((focus) => (
                    <Tag key={focus} size="s" background="brand-alpha-weak" prefixIcon="target">
                      {focus}
                    </Tag>
                  ))}
                </Row>
                <Column as="ul" gap="8">
                  {event.deskPlan.map((plan, planIndex) => (
                    <Row key={planIndex} gap="8" vertical="start">
                      <Icon name="sparkles" onBackground="brand-medium" />
                      <Text as="li" variant="body-default-m">
                        {plan}
                      </Text>
                    </Row>
                  ))}
                </Column>
              </Column>
              {index < ECONOMIC_EVENTS.length - 1 ? <Line background="neutral-alpha-weak" /> : null}
            </Fragment>
          );
        })}
      </Column>
    </Column>
  );
}

export default EconomicCalendarSection;
