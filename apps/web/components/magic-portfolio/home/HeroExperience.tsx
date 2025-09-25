"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Badge,
  Button,
  Column,
  Heading,
  Icon,
  Row,
  Text,
} from "@once-ui-system/core";
import { home } from "@/resources";
import { cn } from "@/utils";
import styles from "./HeroExperience.module.scss";

const ONBOARDING_STEPS = [
  {
    title: "Pick your path",
    subtitle: "60-second quiz tunes the workspace",
    description:
      "Answer five prompts and we pre-load a trading lane that matches your schedule, asset focus, and risk dial.",
    actions: ["Risk dial", "Asset focus", "Session length"],
  },
  {
    title: "Run guided drills",
    subtitle: "Practice inside the simulator",
    description:
      "Follow interactive checklists, timers, and mentor cues while you practice in a zero-capital sandbox.",
    actions: ["Drill timers", "Video cues", "Instant resets"],
  },
  {
    title: "Go live with guardrails",
    subtitle: "Unlock signals once you pass readiness",
    description:
      "Flip on live alerts, auto-journaling, and human support the moment your readiness score crosses the line.",
    actions: ["Risk locks", "Mentor ping", "Auto journal"],
  },
] as const;

const brandColor = (token: string, alpha?: number) =>
  alpha === undefined ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;

const PREVIEW_CARDS = [
  {
    title: "Signal Room",
    subtitle: "Next setup in 2h 14m",
    metricLabel: "Target",
    metricValue: "+1.6%",
    description: "Entry 1.2450 · Risk 0.35%",
    gradient: `linear-gradient(135deg, ${brandColor("--dc-brand", 0.95)} 0%, ${
      brandColor("--dc-secondary", 0.85)
    } 48%, ${brandColor("--dc-brand-dark", 0.85)} 100%)`,
  },
  {
    title: "Mentor Check-in",
    subtitle: "Tonight · 20:00 GMT",
    metricLabel: "Confidence",
    metricValue: "High",
    description: "Bring your trade journal · Submit questions",
    gradient: `linear-gradient(135deg, ${
      brandColor("--dc-secondary", 0.9)
    } 0%, ${brandColor("--dc-accent", 0.78)} 60%, ${
      brandColor("--dc-brand-dark", 0.82)
    } 100%)`,
  },
  {
    title: "Risk Controls",
    subtitle: "Auto warm-up enabled",
    metricLabel: "Max loss",
    metricValue: "0.5%",
    description: "Daily guardrail locks if hit",
    gradient: `linear-gradient(135deg, ${brandColor("--dc-accent", 0.88)} 0%, ${
      brandColor("--dc-secondary", 0.8)
    } 55%, ${brandColor("--dc-brand-dark", 0.85)} 100%)`,
  },
] as const;

const SOCIAL_PROOF = [
  {
    icon: "users",
    value: "8,500+",
    label: "members trade with the desk",
  },
  {
    icon: "timer",
    value: "14 days",
    label: "median time to pass readiness",
  },
  {
    icon: "shield",
    value: "92%",
    label: "renew for another quarter",
  },
] as const;

export function HeroExperience() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = ONBOARDING_STEPS[activeStepIndex];
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, {
    stiffness: 160,
    damping: 22,
    mass: 0.5,
  });
  const springY = useSpring(pointerY, {
    stiffness: 160,
    damping: 22,
    mass: 0.5,
  });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const floatY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const floatOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.65]);

  const primaryCardX = useTransform(springX, (value) => value * 28);
  const primaryCardY = useTransform(springY, (value) => value * 28);
  const primaryRotateX = useTransform(springY, (value) => `${value * -12}deg`);
  const primaryRotateY = useTransform(springX, (value) => `${value * 12}deg`);

  const middleCardX = useTransform(springX, (value) => value * 18);
  const middleCardY = useTransform(springY, (value) => value * 18);
  const middleRotateX = useTransform(springY, (value) => `${value * -8}deg`);
  const middleRotateY = useTransform(springX, (value) => `${value * 8}deg`);

  const backCardX = useTransform(springX, (value) => value * 10);
  const backCardY = useTransform(springY, (value) => value * 10);
  const backRotateX = useTransform(springY, (value) => `${value * -4}deg`);
  const backRotateY = useTransform(springX, (value) => `${value * 4}deg`);

  const orderedCards = useMemo(() => {
    const cards = PREVIEW_CARDS.slice();
    const [active] = cards.splice(activeStepIndex, 1);
    return active ? [active, ...cards] : cards;
  }, [activeStepIndex]);

  const cardTransforms = useMemo(
    () => [
      {
        style: {
          x: primaryCardX,
          y: primaryCardY,
          rotateX: primaryRotateX,
          rotateY: primaryRotateY,
        },
        zIndex: 3,
      },
      {
        style: {
          x: middleCardX,
          y: middleCardY,
          rotateX: middleRotateX,
          rotateY: middleRotateY,
        },
        zIndex: 2,
      },
      {
        style: {
          x: backCardX,
          y: backCardY,
          rotateX: backRotateX,
          rotateY: backRotateY,
        },
        zIndex: 1,
      },
    ],
    [
      primaryCardX,
      primaryCardY,
      primaryRotateX,
      primaryRotateY,
      middleCardX,
      middleCardY,
      middleRotateX,
      middleRotateY,
      backCardX,
      backCardY,
      backRotateX,
      backRotateY,
    ],
  );

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    pointerX.set(Number.isFinite(x) ? x : 0);
    pointerY.set(Number.isFinite(y) ? y : 0);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <Column
      ref={sectionRef}
      fillWidth
      paddingX="16"
      gap="32"
      horizontal="center"
      align="center"
      className={styles.hero}
    >
      <Column
        maxWidth="m"
        gap="24"
        align="center"
        className={styles.heroIntro}
      >
        {home.featured.display
          ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 160,
                damping: 20,
              }}
            >
              <Badge
                background="brand-alpha-weak"
                onBackground="brand-strong"
                paddingX="12"
                paddingY="4"
                textVariant="label-default-s"
                arrow={false}
                href={home.featured.href}
              >
                {home.featured.title}
              </Badge>
            </motion.div>
          )
          : null}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            type: "spring",
            stiffness: 150,
            damping: 24,
          }}
        >
          <Heading
            as="h1"
            wrap="balance"
            variant="display-strong-l"
            align="center"
          >
            {home.headline}
          </Heading>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.32,
            type: "spring",
            stiffness: 150,
            damping: 24,
          }}
        >
          <Text
            wrap="balance"
            align="center"
            onBackground="neutral-weak"
            variant="heading-default-l"
          >
            {home.subline}
          </Text>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.42,
            type: "spring",
            stiffness: 150,
            damping: 24,
          }}
        >
          <Row
            gap="12"
            s={{ direction: "column" }}
            className={styles.actionRow}
          >
            <Button
              id="begin"
              data-border="rounded"
              href="/checkout"
              variant="primary"
              size="l"
              weight="strong"
              prefixIcon="sparkles"
              className={styles.ctaButton}
            >
              Create my trading plan
            </Button>
            <Button
              data-border="rounded"
              href="#vip-packages"
              variant="secondary"
              size="l"
              weight="default"
              arrowIcon
              className={styles.ctaButton}
            >
              Explore VIP options
            </Button>
          </Row>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 150,
            damping: 26,
          }}
        >
          <Text
            align="center"
            onBackground="neutral-medium"
            variant="label-default-m"
          >
            Beginner friendly · Cancel anytime · Real humans on standby
          </Text>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.58,
            type: "spring",
            stiffness: 150,
            damping: 26,
          }}
        >
          <Row
            gap="16"
            wrap
            horizontal="center"
            className={styles.socialProof}
          >
            {SOCIAL_PROOF.map((stat) => (
              <Column
                key={stat.label}
                gap="8"
                background="surface"
                border="neutral-alpha-weak"
                radius="l"
                paddingX="16"
                paddingY="12"
                minWidth={14}
              >
                <Row gap="12" vertical="center">
                  <Icon name={stat.icon} onBackground="brand-medium" />
                  <Column gap="4">
                    <Text variant="heading-strong-m">{stat.value}</Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {stat.label}
                    </Text>
                  </Column>
                </Row>
              </Column>
            ))}
          </Row>
        </motion.div>
      </Column>

      <Row
        gap="40"
        s={{ direction: "column" }}
        align="start"
        fillWidth
        maxWidth="xl"
        className={styles.heroLayout}
      >
        <Column flex={3} gap="20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.56,
              type: "spring",
              stiffness: 180,
              damping: 24,
            }}
            style={{ width: "100%" }}
          >
            <Row gap="12" vertical="center">
              <Badge
                background="brand-alpha-weak"
                onBackground="brand-strong"
                paddingX="12"
                paddingY="2"
                textVariant="label-default-s"
              >
                Guided path
              </Badge>
              <Text onBackground="neutral-weak" variant="label-default-m">
                Tap a tile to preview the experience.
              </Text>
            </Row>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.6,
              type: "spring",
              stiffness: 180,
              damping: 24,
            }}
            className={styles.stepsGrid}
          >
            {ONBOARDING_STEPS.map((step, index) => {
              const isActive = activeStepIndex === index;

              return (
                <motion.button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStepIndex(index)}
                  aria-pressed={isActive}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    styles.stepButton,
                    isActive && styles.stepButtonActive,
                  )}
                  style={{
                    border: `1px solid ${
                      isActive
                        ? brandColor("--dc-secondary", 0.45)
                        : brandColor("--muted", 0.35)
                    }`,
                    background: isActive
                      ? `linear-gradient(135deg, ${
                        brandColor("--dc-secondary", 0.22)
                      }, ${brandColor("--dc-accent", 0.12)})`
                      : brandColor("--dc-brand-dark", 0.35),
                    boxShadow: isActive
                      ? `0 22px 60px ${brandColor("--dc-brand-dark", 0.45)}`
                      : `0 14px 40px ${brandColor("--dc-brand-dark", 0.28)}`,
                  }}
                >
                  <Row gap="12" vertical="center">
                    <Badge
                      background={isActive
                        ? "brand-alpha-medium"
                        : "neutral-alpha-weak"}
                      onBackground={isActive
                        ? "brand-strong"
                        : "neutral-strong"}
                      paddingX="12"
                      paddingY="2"
                      textVariant="label-default-s"
                    >
                      Step {index + 1}
                    </Badge>
                    <Text variant="heading-strong-s">{step.title}</Text>
                  </Row>
                  <Text onBackground="neutral-weak" variant="body-default-s">
                    {step.subtitle}
                  </Text>
                </motion.button>
              );
            })}
          </motion.div>

          <motion.div
            key={activeStep.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 190, damping: 26 }}
            className={styles.stepDetail}
            style={{
              border: `1px solid ${brandColor("--dc-secondary", 0.22)}`,
              background: brandColor("--dc-brand-dark", 0.4),
              boxShadow: `0 18px 45px ${brandColor("--dc-brand-dark", 0.35)}`,
            }}
          >
            <Text variant="body-default-m" onBackground="neutral-weak">
              {activeStep.description}
            </Text>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              {activeStep.actions.map((action) => (
                <Badge
                  key={action}
                  background="neutral-alpha-weak"
                  onBackground="neutral-strong"
                  paddingX="12"
                  paddingY="2"
                  textVariant="label-default-s"
                >
                  {action}
                </Badge>
              ))}
            </div>
          </motion.div>
        </Column>
        <Column flex={4} align="center" fillWidth>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.7,
              type: "spring",
              stiffness: 140,
              damping: 24,
            }}
            style={{ width: "100%", y: floatY }}
          >
            <motion.div
              onPointerMove={handlePointerMove}
              onPointerLeave={resetPointer}
              className={styles.previewSurface}
              style={{
                background: `radial-gradient(circle at top, ${
                  brandColor("--dc-secondary", 0.25)
                }, transparent 65%)`,
              }}
            >
              <motion.div
                animate={{ opacity: [0.45, 0.7, 0.45] }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut",
                }}
                className={styles.previewGlow}
                style={{
                  background: `radial-gradient(circle, ${
                    brandColor("--dc-brand", 0.5)
                  }, transparent 70%)`,
                }}
              />
              <motion.div
                className={styles.previewBorder}
                style={{
                  border: `1px solid ${brandColor("--dc-secondary", 0.18)}`,
                  opacity: floatOpacity,
                }}
              />

              <div className={styles.previewCardStack}>
                {orderedCards.map((card, index) => (
                  <motion.div
                    key={card.title}
                    className={styles.previewCard}
                    style={{
                      zIndex: cardTransforms[index]?.zIndex ?? 1,
                      background: card.gradient,
                      ...cardTransforms[index]?.style,
                      marginTop: index === 0 ? 0 : undefined,
                    }}
                  >
                    <Column gap="12">
                      <Text variant="label-default-m" onBackground="brand-weak">
                        {card.subtitle}
                      </Text>
                      <Heading variant="display-strong-xs" as="h3">
                        {card.title}
                      </Heading>
                      <Row gap="12" vertical="center">
                        <Badge
                          background="neutral-alpha-weak"
                          onBackground="neutral-strong"
                          paddingX="12"
                          paddingY="2"
                          textVariant="label-default-s"
                        >
                          {card.metricLabel}
                        </Badge>
                        <Text variant="heading-strong-m">
                          {card.metricValue}
                        </Text>
                      </Row>
                      <Text variant="body-default-m">{card.description}</Text>
                    </Column>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </Column>
      </Row>
    </Column>
  );
}
