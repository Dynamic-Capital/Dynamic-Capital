import { Fragment } from "react";

import { about } from "@/resources";
import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

type MentorshipProgram = {
  id: string;
  name: string;
  cadence: string;
  description: string;
  focus: string;
  features: string[];
  planId?: string;
  primaryCtaHref?: string;
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

const PROGRAMS: MentorshipProgram[] = [
  {
    id: "performance-sprint",
    name: "Performance Sprint",
    cadence: "4-week intensive",
    description:
      "Weekly accountability designed for traders who need sharper execution and risk discipline.",
    focus:
      "Pair live desk signals with one-on-one reviews so you ship more trades that respect the playbook you wrote.",
    features: [
      "Live desk reviews every week with action items and confidence scoring",
      "Automation checklist tailored to your exchange stack",
      "Risk framework calibration with drawdown guardrails",
    ],
    planId: "vip-quarterly",
    primaryCtaLabel: "Join with quarterly access",
    secondaryCtaLabel: "Book a sprint consult",
  },
  {
    id: "founders-circle",
    name: "Founders Circle",
    cadence: "12-week residency",
    description:
      "For fund leads and trading teams scaling managed capital with institutional oversight.",
    focus:
      "Blend mentorship, automation, and reporting so every operator on your desk executes against the same guardrails.",
    features: [
      "Desk integration workshops covering automation, reporting, and compliance",
      "Scenario planning drills across macro, crypto, and commodities portfolios",
      "Private signal channels with priority mentor escalation",
    ],
    planId: "vip-lifetime",
    primaryCtaLabel: "Unlock with lifetime access",
    secondaryCtaLabel: "Talk with the mentorship lead",
  },
  {
    id: "loss-recovery-programme",
    name: "Loss Recovery Programme",
    cadence: "Application-based",
    description:
      "A structured turnaround plan for disciplined traders facing sustained drawdowns.",
    focus:
      "Audit live trading history, reset risk, and rebuild execution habits before scaling back into full size.",
    features: [
      "Read-only MT4/MT5 or Myfxbook/FXBlue audit by senior strategists",
      "Tailored recovery roadmap covering risk reset and position sizing",
      "Session rules and playbook setups to restore disciplined execution",
    ],
    primaryCtaLabel: "Submit details for review",
    primaryCtaHref: "#loss-recovery",
    secondaryCtaLabel: "Book the recovery review",
  },
];

export function MentorshipProgramsSection() {
  return (
    <Column
      id="mentorship-programs"
      fillWidth
      background="surface"
      border="neutral-alpha-medium"
      radius="l"
      padding="xl"
      gap="32"
      shadow="l"
      style={{ scrollMarginTop: "96px" }}
    >
      <Column gap="12" maxWidth={32}>
        <Heading variant="display-strong-xs">
          Mentorship built around execution
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Cohorts pair live trading signals with accountability cadences so you
          build the habits that drive performance.
        </Text>
      </Column>
      <Column gap="24">
        {PROGRAMS.map((program, index) => (
          <Fragment key={program.id}>
            <Column
              background="page"
              border="neutral-alpha-weak"
              radius="l"
              padding="l"
              gap="20"
            >
              <Row
                horizontal="between"
                vertical="center"
                gap="12"
                s={{ direction: "column", align: "start" }}
              >
                <Column gap="8">
                  <Heading variant="heading-strong-m">{program.name}</Heading>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    {program.description}
                  </Text>
                </Column>
                <Tag size="s" prefixIcon="timer">
                  {program.cadence}
                </Tag>
              </Row>
              <Text variant="body-default-m">{program.focus}</Text>
              <Column as="ul" gap="8">
                {program.features.map((feature, featureIndex) => (
                  <Row key={featureIndex} gap="8" vertical="center">
                    <Icon name="check" onBackground="brand-medium" />
                    <Text as="li" variant="body-default-m">
                      {feature}
                    </Text>
                  </Row>
                ))}
              </Column>
              <Row gap="12" s={{ direction: "column" }}>
                {(() => {
                  const primaryHref = program.primaryCtaHref ??
                    (program.planId
                      ? `/checkout?plan=${encodeURIComponent(program.planId)}`
                      : undefined);

                  return primaryHref
                    ? (
                      <Button
                        size="m"
                        variant="secondary"
                        data-border="rounded"
                        prefixIcon="sparkles"
                        href={primaryHref}
                      >
                        {program.primaryCtaLabel}
                      </Button>
                    )
                    : null;
                })()}
                {(() => {
                  const secondaryHref = program.secondaryCtaHref ??
                    about.calendar.link;

                  if (
                    !program.secondaryCtaLabel ||
                    !about.calendar.display ||
                    !secondaryHref
                  ) {
                    return null;
                  }

                  return (
                    <Button
                      size="m"
                      variant="secondary"
                      data-border="rounded"
                      prefixIcon="calendar"
                      href={secondaryHref}
                    >
                      {program.secondaryCtaLabel}
                    </Button>
                  );
                })()}
              </Row>
            </Column>
            {index < PROGRAMS.length - 1
              ? <Line background="neutral-alpha-weak" />
              : null}
          </Fragment>
        ))}
      </Column>
    </Column>
  );
}

export default MentorshipProgramsSection;
