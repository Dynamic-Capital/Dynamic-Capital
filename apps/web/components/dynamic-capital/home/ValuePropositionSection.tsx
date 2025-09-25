import { Fragment } from "react";

import {
  Badge,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { schema } from "@/resources";

type ValuePillar = {
  id: string;
  eyebrow: string;
  icon: string;
  title: string;
  description: string;
  highlights: string[];
};

type ProofPoint = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

const VALUE_PILLARS: ValuePillar[] = [
  {
    id: "clarity",
    eyebrow: "Personalized runway",
    icon: "sparkles",
    title: "A desk configured for you",
    description:
      "Intake responses sync playbooks, automations, and guardrails to your trading objective so you always know the next lever to pull.",
    highlights: [
      "Prep briefings tuned to your asset focus and timezone",
      "Automation toggles matched to your risk ceiling",
      "Daily agenda that pairs catalysts with your routine",
    ],
  },
  {
    id: "execution",
    eyebrow: "Stay disciplined live",
    icon: "target",
    title: "Institutional-grade execution",
    description:
      "Live signals, structured journaling, and automated risk locks keep every trade accountable to a documented playbook.",
    highlights: [
      "Signal room entries with risk, management, and context",
      "Auto-journaling feeds readiness and performance scoring",
      "Drawdown brakes and allocation throttles that trip instantly",
    ],
  },
  {
    id: "support",
    eyebrow: "Human backup on-demand",
    icon: "users",
    title: "Mentors in your corner",
    description:
      "Analysts, coaches, and focused cohorts review your plan, answer questions, and keep momentum high before and after every session.",
    highlights: [
      "Desk chat escalates to human mentors 24/7",
      "Weekly performance reviews with actionable next steps",
      "Private cohorts tailored to founders, funds, and operators",
    ],
  },
];

const PROOF_POINTS: ProofPoint[] = [
  {
    id: "readiness",
    label: "Median time to readiness unlock",
    value: "12 days",
    detail: "members activate live alerts after guided drills",
  },
  {
    id: "discipline",
    label: "Playbook adherence",
    value: "91%",
    detail: "average consistency once automation is enabled",
  },
  {
    id: "retention",
    label: "Quarterly renewals",
    value: "94%",
    detail: "choose to stay on the desk with mentors",
  },
];

export function ValuePropositionSection() {
  const organizationName = schema.name;

  return (
    <Column
      id="value-proposition"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
    >
      <Column gap="12" maxWidth={32}>
        <Tag size="s" background="brand-alpha-weak" prefixIcon="shield">
          Why traders choose {organizationName}
        </Tag>
        <Heading variant="display-strong-xs">
          Personalized automation, proven playbooks, and human backup in one
          workflow
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Focus on high-conviction trades while the desk absorbs prep, context,
          and accountability from intake to live execution.
        </Text>
      </Column>

      <Column gap="24">
        {VALUE_PILLARS.map((pillar, index) => (
          <Fragment key={pillar.id}>
            <Row
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="20"
              s={{ direction: "column" }}
            >
              <Row
                gap="12"
                vertical="center"
                s={{ direction: "column", align: "start" }}
              >
                <Badge
                  background="neutral-alpha-weak"
                  onBackground="neutral-strong"
                  paddingX="12"
                  paddingY="4"
                  textVariant="label-default-s"
                >
                  {pillar.eyebrow}
                </Badge>
                <Row gap="12" vertical="center">
                  <Icon name={pillar.icon} onBackground="brand-medium" />
                  <Heading variant="heading-strong-l">{pillar.title}</Heading>
                </Row>
              </Row>
              <Column gap="16">
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {pillar.description}
                </Text>
                <Column as="ul" gap="8">
                  {pillar.highlights.map((highlight) => (
                    <Row key={highlight} gap="8" vertical="center">
                      <Icon name="check" onBackground="brand-medium" />
                      <Text as="li" variant="body-default-m">
                        {highlight}
                      </Text>
                    </Row>
                  ))}
                </Column>
              </Column>
            </Row>
            {index < VALUE_PILLARS.length - 1
              ? <Line background="neutral-alpha-weak" />
              : null}
          </Fragment>
        ))}
      </Column>

      <Column
        background="page"
        border="neutral-alpha-weak"
        radius="l"
        padding="l"
        gap="16"
      >
        <Row gap="16" wrap>
          {PROOF_POINTS.map((point) => (
            <Column key={point.id} gap="8" minWidth={12}>
              <Text variant="label-default-m" onBackground="brand-medium">
                {point.label}
              </Text>
              <Heading variant="display-strong-xs">{point.value}</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {point.detail}
              </Text>
            </Column>
          ))}
        </Row>
      </Column>
    </Column>
  );
}

export default ValuePropositionSection;
