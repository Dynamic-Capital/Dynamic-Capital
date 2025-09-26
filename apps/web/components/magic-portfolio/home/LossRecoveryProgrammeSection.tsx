import { Fragment } from "react";

import {
  Column,
  Heading,
  Icon,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import styles from "../DynamicCapitalLandingPage.module.scss";

type RecoveryStep = {
  title: string;
  description: string;
  supportingText?: string;
  bullets?: string[];
};

const HOW_IT_WORKS: RecoveryStep[] = [
  {
    title: "Submit your trading history (read-only)",
    description:
      "Share your MT4/MT5 investor password or a Myfxbook/FXBlue read-only link so the desk can audit live data.",
    supportingText:
      "We analyze strategy habits, drawdown profile, risk, and execution before prescribing adjustments.",
  },
  {
    title: "Personal review",
    description:
      "Book a 1:1 session once the audit is complete for a tailored Recovery Plan covering the core levers.",
    bullets: [
      "Risk reset calibrated to your drawdown ceiling",
      "Position sizing recalculated against current equity",
      "Session rules optimized around market windows",
      "Playbook setups prioritized for rebuilding confidence",
    ],
  },
  {
    title: "Live Q&A with our experts",
    description:
      "Join a Zoom or Telegram call to walk through the recovery roadmap, clarify execution steps, and confirm accountability milestones.",
  },
];

const HIGH_LOSS_DETAILS = [
  "Priority access to senior strategists",
  "Choice of private in-person meeting or executive Zoom",
  "NDA support available on request",
] as const;

const SUITABILITY = [
  "You’re in drawdown or stuck managing hedged positions",
  "You want a structured path back with accountability checkpoints",
] as const;

const APPLY_FLOW = [
  "Submit details",
  "Book review",
  "Get your plan",
  "Implement with support",
] as const;

export function LossRecoveryProgrammeSection() {
  return (
    <Column
      id="loss-recovery"
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
          Loss Recovery Programme
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Help disciplined traders turn around drawdowns and rebuild equity with
          a clear, risk-first plan.
        </Text>
      </Column>

      <div className={styles.lossRecoveryGrid}>
        <Column gap="20">
          <Column gap="12">
            <Heading variant="heading-strong-s">How it works</Heading>
            <Column as="ol" gap="16" className={styles.stepList}>
              {HOW_IT_WORKS.map((step, index) => (
                <Column as="li" key={step.title} gap="12">
                  <Row gap="12" vertical="start">
                    <Tag size="s" background="brand-alpha-weak">
                      Step {index + 1}
                    </Tag>
                    <Heading variant="heading-strong-s">
                      {step.title}
                    </Heading>
                  </Row>
                  <Text variant="body-default-m">{step.description}</Text>
                  {step.supportingText
                    ? (
                      <Text
                        variant="body-default-m"
                        onBackground="neutral-weak"
                      >
                        {step.supportingText}
                      </Text>
                    )
                    : null}
                  {step.bullets
                    ? (
                      <Column as="ul" gap="8">
                        {step.bullets.map((bullet) => (
                          <Row key={bullet} gap="8" vertical="center">
                            <Icon name="check" onBackground="brand-medium" />
                            <Text as="li" variant="body-default-m">
                              {bullet}
                            </Text>
                          </Row>
                        ))}
                      </Column>
                    )
                    : null}
                </Column>
              ))}
            </Column>
          </Column>
        </Column>

        <Column gap="20">
          <Column
            background="brand-alpha-weak"
            border="brand-alpha-medium"
            radius="l"
            padding="l"
            gap="12"
          >
            <Tag size="s" background="brand-alpha-weak" prefixIcon="shield">
              High-Loss Desk (&gt;$500k)
            </Tag>
            <Column as="ul" gap="8">
              {HIGH_LOSS_DETAILS.map((detail) => (
                <Row key={detail} gap="8" vertical="center">
                  <Icon name="users" onBackground="brand-medium" />
                  <Text as="li" variant="body-default-m">
                    {detail}
                  </Text>
                </Row>
              ))}
            </Column>
          </Column>

          <Column
            background="page"
            border="neutral-alpha-weak"
            radius="l"
            padding="l"
            gap="8"
          >
            <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
              Fees
            </Tag>
            <Text variant="body-default-m">
              Performance-based options available for eligible cases — no
              upfront fee for select profiles, subject to assessment.
            </Text>
          </Column>

          <Column
            background="page"
            border="neutral-alpha-weak"
            radius="l"
            padding="l"
            gap="8"
          >
            <Tag size="s" background="brand-alpha-weak" prefixIcon="timer">
              Availability
            </Tag>
            <Text variant="body-default-m">
              Limited to the first 100 traders this cycle.
            </Text>
          </Column>
        </Column>
      </div>

      <Column gap="20">
        <Column gap="12">
          <Heading variant="heading-strong-s">Who should apply</Heading>
          <Column as="ul" gap="8">
            {SUITABILITY.map((item) => (
              <Row key={item} gap="8" vertical="center">
                <Icon name="check" onBackground="brand-medium" />
                <Text as="li" variant="body-default-m">
                  {item}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>

        <Column gap="12">
          <Heading variant="heading-strong-s">Apply</Heading>
          <div className={styles.applyFlow}>
            {APPLY_FLOW.map((step, index) => (
              <Fragment key={step}>
                <Tag size="m" background="brand-alpha-weak">
                  {step}
                </Tag>
                {index < APPLY_FLOW.length - 1
                  ? (
                    <Text
                      as="span"
                      variant="body-default-m"
                      onBackground="neutral-weak"
                      className={styles.applyFlowArrow}
                    >
                      →
                    </Text>
                  )
                  : null}
              </Fragment>
            ))}
          </div>
        </Column>
      </Column>
    </Column>
  );
}

export default LossRecoveryProgrammeSection;
