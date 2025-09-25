"use client";

import {
  Button,
  Column,
  Heading,
  Icon,
  Line,
  Row,
  SmartLink,
  Tag,
  Text,
} from "@/components/dynamic-ui-system";
import { home, person, social } from "@/resources";
import { useEffect, useState } from "react";

const TELEGRAM_LINK = social.find((item) => item.name === "Telegram")?.link ||
  "https://t.me/Dynamic_VIP_BOT";

const SUPPORT_EMAIL = `mailto:${person.email}`;

const SOCIAL_PROOF = [
  {
    icon: "sparkles" as const,
    value: "8,500+",
    label: "members trade with the desk",
  },
  {
    icon: "calendar" as const,
    value: "14 days",
    label: "median time to see progress",
  },
  {
    icon: "repeat" as const,
    value: "92%",
    label: "renew for another quarter",
  },
];

const FOUNDATION_PILLS = [
  "Risk basics",
  "Momentum drills",
  "Trade journaling",
  "Mindset warm-ups",
];

const ONBOARDING_STEPS = [
  {
    id: "orientation",
    label: "Orientation sprint",
    icon: "sparkles" as const,
    summary:
      "Five bite-sized prompts help you define a goal, funding level, and time commitment in under ten minutes.",
    highlights: [
      "Tour the workspace and translate jargon into plain language",
      "Pin your first checklist so you always know the next move",
      "Bookmark the dashboard that tracks progress in real time",
    ],
    actionLabel: "Open guided workspace",
    actionHref: home.path,
  },
  {
    id: "practice",
    label: "Practice in the simulator",
    icon: "calendar" as const,
    summary:
      "Lock in a weekly drill using the desk calendar and rehearse the strategy on live markets without risking capital.",
    highlights: [
      "Follow a mentor-led warm-up before every session",
      "Journal practice trades with one-click templates",
      "Collect instant feedback to celebrate small wins early",
    ],
    actionLabel: "Schedule a drill",
    actionHref: "/plans",
  },
  {
    id: "feedback",
    label: "Get mentor feedback",
    icon: "repeat" as const,
    summary:
      "Share your trading plan for a desk-side review and get a personal redirect toward VIP coaching or group labs.",
    highlights: [
      "Upload your plan for a recorded walkthrough",
      "Collect community playbooks matched to your goals",
      "Decide whether to scale solo or join a live lab",
    ],
    actionLabel: "Message the mentors",
    actionHref: TELEGRAM_LINK,
  },
];

const DESK_TIME_ZONE = person.location ?? "UTC";

const DESK_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: DESK_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
};

const DESK_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: DESK_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "2-digit",
};

function getDeskSnapshot() {
  const now = new Date();

  return {
    time: new Intl.DateTimeFormat("en-US", DESK_TIME_FORMAT).format(now),
    date: new Intl.DateTimeFormat("en-US", DESK_DATE_FORMAT).format(now),
  };
}

export function RouteArchiveNotice() {
  const [deskSnapshot, setDeskSnapshot] = useState(getDeskSnapshot);
  const [activeStep, setActiveStep] = useState(ONBOARDING_STEPS[0]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDeskSnapshot(getDeskSnapshot());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <Column
      as="section"
      fillWidth
      paddingY="80"
      paddingX="16"
      horizontal="center"
      align="center"
      gap="48"
    >
      <Column
        as="article"
        background="surface"
        border="neutral-alpha-medium"
        radius="xl"
        shadow="xl"
        padding="xl"
        gap="40"
        maxWidth="l"
        fillWidth
        align="center"
        horizontal="center"
      >
        <Column gap="16" align="center">
          <Tag size="s" background="brand-alpha-weak" prefixIcon="sparkles">
            New: Guided onboarding workspace
          </Tag>
          <Heading variant="display-strong-s" align="center" wrap="balance">
            Trade with confidence, even if you&apos;re just getting started.
          </Heading>
          <Text
            variant="body-default-l"
            onBackground="neutral-weak"
            align="center"
            wrap="balance"
          >
            Answer five prompts, run drills in a guided simulator, and switch on
            live signals once you&apos;re ready—no jargon, just a clear next
            step every time.
          </Text>
          <Text
            variant="body-default-m"
            onBackground="neutral-medium"
            align="center"
            wrap="balance"
          >
            The link you followed was sunset during our navigation refresh.
            Start the guided workspace below or jump to another desk surface.
          </Text>
        </Column>

        <Column gap="16" align="center">
          <Row gap="12" wrap horizontal="center">
            <Button
              size="m"
              variant="primary"
              data-border="rounded"
              prefixIcon="sparkles"
              href="/checkout"
            >
              Create my trading plan
            </Button>
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              prefixIcon="crown"
              href="/plans"
            >
              Explore VIP options
            </Button>
          </Row>
          <Text
            variant="label-default-s"
            onBackground="neutral-weak"
            align="center"
            wrap="balance"
          >
            Beginner friendly · Cancel anytime · Real humans on standby
          </Text>
        </Column>

        <Column gap="24" fillWidth align="center">
          <Column gap="12" align="center">
            <Text variant="label-strong-s" onBackground="brand-strong">
              Choose a learning lane
            </Text>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              align="center"
              wrap="balance"
            >
              Tap a card to see what to do next—each lane blends tutorials,
              practice reps, and human support so you never feel stuck.
            </Text>
          </Column>
          <Row gap="16" wrap horizontal="center">
            {ONBOARDING_STEPS.map((step) => {
              const isActive = activeStep.id === step.id;

              return (
                <Column
                  key={step.id}
                  as="button"
                  onClick={() => setActiveStep(step)}
                  gap="12"
                  background={isActive
                    ? "brand-alpha-strong"
                    : "neutral-alpha-weak"}
                  border={isActive ? "brand-medium" : "neutral-alpha-weak"}
                  radius="l"
                  paddingX="20"
                  paddingY="16"
                  minWidth={18}
                  fillWidth
                  horizontal="start"
                  data-active={isActive ? "true" : "false"}
                  aria-pressed={isActive}
                >
                  <Row gap="12" vertical="center">
                    <Icon
                      name={step.icon}
                      onBackground={isActive ? "brand-strong" : "brand-medium"}
                    />
                    <Column gap="4" horizontal="start">
                      <Text variant="label-strong-s" align="left">
                        {step.label}
                      </Text>
                      <Text
                        variant="label-default-s"
                        onBackground={isActive
                          ? "neutral-strong"
                          : "neutral-weak"}
                        align="left"
                      >
                        {step.summary}
                      </Text>
                    </Column>
                  </Row>
                </Column>
              );
            })}
          </Row>
          <Column
            background="surface"
            border="brand-alpha-medium"
            radius="xl"
            padding="l"
            gap="16"
            fillWidth
            horizontal="start"
          >
            <Row gap="12" vertical="center">
              <Icon name={activeStep.icon} onBackground="brand-medium" />
              <Heading variant="heading-strong-m">
                {activeStep.label}
              </Heading>
            </Row>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {activeStep.summary}
            </Text>
            <Column gap="8">
              {activeStep.highlights.map((item) => (
                <Row key={item} gap="8" vertical="center">
                  <Icon name="check" onBackground="brand-medium" />
                  <Text variant="body-default-s" onBackground="neutral-strong">
                    {item}
                  </Text>
                </Row>
              ))}
            </Column>
            <Button
              size="m"
              variant="primary"
              data-border="rounded"
              href={activeStep.actionHref}
            >
              {activeStep.actionLabel}
            </Button>
          </Column>
        </Column>

        <Column gap="12" align="center">
          <Text variant="label-strong-s" onBackground="neutral-strong">
            Core skills you&apos;ll build
          </Text>
          <Row gap="8" wrap horizontal="center">
            {FOUNDATION_PILLS.map((topic) => (
              <Tag key={topic} size="s" background="neutral-alpha-weak">
                {topic}
              </Tag>
            ))}
          </Row>
        </Column>

        <Row gap="16" wrap horizontal="center">
          {SOCIAL_PROOF.map((stat) => (
            <Column
              key={stat.label}
              gap="8"
              background="surface"
              border="neutral-alpha-weak"
              radius="l"
              paddingX="20"
              paddingY="16"
              minWidth={16}
              fillWidth
            >
              <Row gap="12" vertical="center">
                <Icon name={stat.icon} onBackground="brand-medium" />
                <Column gap="4">
                  <Text variant="heading-strong-m">{stat.value}</Text>
                  <Text
                    variant="label-default-s"
                    onBackground="neutral-weak"
                  >
                    {stat.label}
                  </Text>
                </Column>
              </Row>
            </Column>
          ))}
        </Row>

        <Column
          background="neutral-alpha-weak"
          border="neutral-alpha-medium"
          radius="l"
          padding="l"
          gap="20"
          align="center"
          fillWidth
        >
          <Column gap="8" align="center">
            <Text variant="label-strong-s" onBackground="neutral-strong">
              Need a human handoff?
            </Text>
            <Text
              variant="body-default-m"
              onBackground="neutral-strong"
              align="center"
              wrap="balance"
            >
              Book a 15-minute desk handoff, drop a note, or ping us in
              Telegram—we&apos;ll redirect you to the right modern playbook.
            </Text>
          </Column>
          <Row gap="12" wrap horizontal="center">
            <Button
              size="m"
              variant="primary"
              data-border="rounded"
              prefixIcon="sparkles"
              href="/checkout"
            >
              Book a kickoff call
            </Button>
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              prefixIcon="telegram"
              href={TELEGRAM_LINK}
            >
              Chat with the desk
            </Button>
            <Button
              size="m"
              variant="secondary"
              data-border="rounded"
              href={SUPPORT_EMAIL}
            >
              Email support
            </Button>
          </Row>
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            align="center"
            wrap="balance"
          >
            Prefer to explore? Head back to the{" "}
            <SmartLink href={home.path}>home hub</SmartLink>{" "}
            for live playbooks, quick wins, and resource libraries.
          </Text>
        </Column>

        <Line background="neutral-alpha-weak" />
        <Column gap="8" align="center">
          <Row gap="8" vertical="center" horizontal="center">
            <Tag size="s" background="neutral-alpha-weak" prefixIcon="clock">
              Desk time ({DESK_TIME_ZONE})
            </Tag>
            <Text variant="label-strong-s" onBackground="neutral-strong">
              {deskSnapshot.time}
            </Text>
          </Row>
          <Text
            variant="label-default-s"
            onBackground="neutral-weak"
            align="center"
            wrap="balance"
          >
            {deskSnapshot.date}. Bookmark the{" "}
            <SmartLink href={home.path}>home hub</SmartLink>{" "}
            for the latest rollouts and desk experiments.
          </Text>
        </Column>
      </Column>
    </Column>
  );
}

export default RouteArchiveNotice;
