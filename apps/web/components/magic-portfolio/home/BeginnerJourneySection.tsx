"use client";

import { useMemo } from "react";

import { motion, useReducedMotion } from "framer-motion";

import {
  Button,
  Column,
  Heading,
  Icon,
  Row,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";

import styles from "./BeginnerJourneySection.module.scss";

type JourneyStep = {
  title: string;
  description: string;
  milestone: string;
  focus: string[];
};

type SupportResource = {
  title: string;
  description: string;
  icon: "sparkles" | "book" | "repeat" | "globe";
};

const JOURNEY_STEPS: JourneyStep[] = [
  {
    title: "Guided desk tour",
    milestone: "Day 0 · 5 minutes",
    description:
      "Interactive walkthrough shows where to find watchlists, mentor chat, and readiness scorecards without overwhelm.",
    focus: ["Workspace primer", "Notification setup", "Desk orientation"],
  },
  {
    title: "Practice with mentors",
    milestone: "Day 2 · 20 minutes",
    description:
      "Mentor-led rehearsals pair timers, callouts, and feedback loops so you feel confident before the first live session.",
    focus: ["Live drill replay", "Automation sandbox", "Feedback digest"],
  },
  {
    title: "Flip the funding switch",
    milestone: "Day 7 · 15 minutes",
    description:
      "Once your readiness score is verified, connect capital providers and sync guardrails without leaving the flow.",
    focus: ["Broker linking", "Risk thresholds", "Capital unlock"],
  },
];

const SUPPORT_RESOURCES: SupportResource[] = [
  {
    title: "Beginner playbook library",
    description:
      "Bite-sized lessons and checklists cover core concepts and vocabulary before you dive into live markets.",
    icon: "book",
  },
  {
    title: "Live desk orientation",
    description:
      "Join a real-time cohort welcome call where mentors answer questions and help you personalize the automation.",
    icon: "sparkles",
  },
  {
    title: "Automation concierge",
    description:
      "Dedicated specialists configure integrations, alerts, and risk settings so nothing breaks when you connect accounts.",
    icon: "repeat",
  },
  {
    title: "Global trading calendar",
    description:
      "See the macro roadmap by timezone so you always know which session to prep for next.",
    icon: "globe",
  },
];

export function BeginnerJourneySection() {
  const reduceMotion = useReducedMotion();

  const cardMotion = useMemo(
    () => ({
      initial: { opacity: 0, y: 20 },
      whileInView: reduceMotion ? undefined : { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.4 },
      transition: reduceMotion
        ? undefined
        : ({ type: "spring", stiffness: 200, damping: 24 } as const),
      whileHover: reduceMotion ? undefined : { y: -6, scale: 1.01 },
    }),
    [reduceMotion],
  );

  return (
    <Column fillWidth gap="24" align="start">
      <Column gap="12" align="start">
        <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
          Step-by-step beginner flow
        </Tag>
        <Heading variant="display-strong-xs" wrap="balance">
          Follow a calm path from first login to funded trading
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          wrap="balance"
        >
          Every stage is broken into approachable missions so new traders always
          know the next best action, when to ask for help, and how close they
          are to unlocking capital.
        </Text>
      </Column>
      <div className={styles.flowGrid}>
        {JOURNEY_STEPS.map((step, index) => (
          <motion.article
            key={step.title}
            className={styles.flowCard}
            {...cardMotion}
          >
            <span className={styles.flowAccent} aria-hidden />
            <Column
              background="surface"
              border="neutral-alpha-weak"
              radius="l"
              padding="xl"
              gap="16"
              align="start"
            >
              <Row gap="12" vertical="center">
                <Tag
                  size="s"
                  background="brand-alpha-weak"
                  onBackground="brand-strong"
                >
                  Step {String(index + 1).padStart(2, "0")}
                </Tag>
                <Text variant="label-default-s" onBackground="brand-weak">
                  {step.milestone}
                </Text>
              </Row>
              <Heading variant="heading-strong-m">{step.title}</Heading>
              <Text
                variant="body-default-m"
                onBackground="neutral-weak"
                wrap="balance"
              >
                {step.description}
              </Text>
              <ul className={styles.resources}>
                {step.focus.map((item) => (
                  <li key={item}>
                    <Row gap="8" vertical="center">
                      <Icon name="check" onBackground="brand-medium" />
                      <Text variant="body-default-s">{item}</Text>
                    </Row>
                  </li>
                ))}
              </ul>
            </Column>
          </motion.article>
        ))}
      </div>
      <Column gap="16" align="start">
        <Heading variant="heading-strong-m">
          Personal support is available on every milestone
        </Heading>
        <Row gap="16" wrap>
          {SUPPORT_RESOURCES.map((resource) => (
            <motion.div
              key={resource.title}
              {...cardMotion}
            >
              <Column
                background="surface"
                border="neutral-alpha-weak"
                radius="l"
                padding="l"
                gap="12"
                align="start"
              >
                <Row gap="12" vertical="center">
                  <Icon name={resource.icon} onBackground="brand-medium" />
                  <Heading variant="heading-strong-s">{resource.title}</Heading>
                </Row>
                <Text
                  variant="body-default-s"
                  onBackground="neutral-weak"
                  wrap="balance"
                >
                  {resource.description}
                </Text>
              </Column>
            </motion.div>
          ))}
        </Row>
        <Row className={styles.timeline}>
          <Icon name="sparkles" onBackground="brand-medium" />
          <Text variant="label-default-s" onBackground="neutral-weak">
            Ready to start? The guided setup takes less than ten minutes.
          </Text>
        </Row>
        <Button
          href="#begin"
          variant="primary"
          size="l"
          weight="strong"
          prefixIcon="sparkles"
        >
          Launch the guided setup
        </Button>
      </Column>
    </Column>
  );
}
