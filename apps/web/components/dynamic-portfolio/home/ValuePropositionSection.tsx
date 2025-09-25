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
} from "@once-ui-system/core";
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
    eyebrow: "Get oriented fast",
    icon: "sparkles",
    title: "Clarity from day one",
    description:
      "Launch with a 60-second intake that maps your asset focus, schedule, and risk limits to a ready-to-run workspace.",
    highlights: [
      "Daily prep flows with the exact catalysts to watch",
      "Automation toggles that respect your risk dial",
      "Mentor nudges so you never guess at the next action",
    ],
  },
  {
    id: "execution",
    eyebrow: "Trade with structure",
    icon: "target",
    title: "Institutional execution",
    description:
      "Pair live desk signals with guardrails that keep you inside plan—from simulated drills to funded account readiness.",
    highlights: [
      "Signal room alerts with precise entry and exit levels",
      "Auto-journaling and readiness scoring after every session",
      "Risk locks that pause allocation when guardrails are hit",
    ],
  },
  {
    id: "support",
    eyebrow: "Stay accountable",
    icon: "users",
    title: "Support when it matters",
    description:
      "Access mentors, desk analysts, and a focused trading community so questions are answered before capital is at risk.",
    highlights: [
      "24/7 desk chat with escalation to human mentors",
      "Weekly performance reviews with action items",
      "Private cohorts for founders, funds, and operators",
    ],
  },
];

const PROOF_POINTS: ProofPoint[] = [
  {
    id: "readiness",
    label: "Members pass readiness in",
    value: "14 days",
    detail: "median time to unlock live alerts",
  },
  {
    id: "discipline",
    label: "Weekly playbook adherence",
    value: "87%",
    detail: "average across funded traders",
  },
  {
    id: "retention",
    label: "Members renewing each quarter",
    value: "92%",
    detail: "choose to stay on the desk",
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
          Signal clarity, execution guardrails, and human accountability in one
          lane
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Everything we ship is built to remove hesitation—so you focus on
          taking the next high-quality trade while the desk handles prep,
          context, and risk.
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
