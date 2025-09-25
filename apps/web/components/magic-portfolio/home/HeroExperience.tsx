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

const BRAND_RGB = {
  deepNavy: "8, 0, 47",
  navy: "18, 24, 63",
  midnight: "20, 31, 88",
  blue: "80, 113, 204",
  sky: "111, 148, 241",
  aqua: "18, 163, 215",
  teal: "13, 148, 136",
  mist: "178, 212, 255",
} as const;

const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;

const PREVIEW_CARDS = [
  {
    title: "Signal Room",
    subtitle: "Next setup in 2h 14m",
    metricLabel: "Target",
    metricValue: "+1.6%",
    description: "Entry 1.2450 · Risk 0.35%",
    gradient: `linear-gradient(135deg, ${rgba(BRAND_RGB.blue, 0.95)} 0%, ${
      rgba(BRAND_RGB.sky, 0.85)
    } 48%, ${rgba(BRAND_RGB.deepNavy, 0.85)} 100%)`,
  },
  {
    title: "Mentor Check-in",
    subtitle: "Tonight · 20:00 GMT",
    metricLabel: "Confidence",
    metricValue: "High",
    description: "Bring your trade journal · Submit questions",
    gradient: `linear-gradient(135deg, ${rgba(BRAND_RGB.aqua, 0.9)} 0%, ${
      rgba(BRAND_RGB.sky, 0.78)
    } 60%, ${rgba(BRAND_RGB.navy, 0.82)} 100%)`,
  },
  {
    title: "Risk Controls",
    subtitle: "Auto warm-up enabled",
    metricLabel: "Max loss",
    metricValue: "0.5%",
    description: "Daily guardrail locks if hit",
    gradient: `linear-gradient(135deg, ${rgba(BRAND_RGB.teal, 0.88)} 0%, ${
      rgba(BRAND_RGB.aqua, 0.8)
    } 55%, ${rgba(BRAND_RGB.deepNavy, 0.85)} 100%)`,
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
    >
      <Column maxWidth="m" gap="24" align="center">
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
          <Row gap="12" s={{ direction: "column" }}>
            <Button
              id="begin"
              data-border="rounded"
              href="/checkout"
              variant="primary"
              size="l"
              weight="strong"
              prefixIcon="sparkles"
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
          <Row gap="16" wrap horizontal="center">
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
            style={{
              display: "grid",
              gap: "12px",
              width: "100%",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
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
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "20px 24px",
                    borderRadius: "24px",
                    border: `1px solid ${
                      isActive
                        ? rgba(BRAND_RGB.sky, 0.45)
                        : rgba(BRAND_RGB.mist, 0.25)
                    }`,
                    background: isActive
                      ? `linear-gradient(135deg, ${
                        rgba(BRAND_RGB.sky, 0.22)
                      }, ${rgba(BRAND_RGB.aqua, 0.12)})`
                      : rgba(BRAND_RGB.deepNavy, 0.35),
                    boxShadow: isActive
                      ? `0 22px 60px ${rgba(BRAND_RGB.deepNavy, 0.45)}`
                      : `0 14px 40px ${rgba(BRAND_RGB.navy, 0.28)}`,
                    color: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                    backdropFilter: "blur(14px)",
                    transition:
                      "border 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
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
            style={{
              width: "100%",
              borderRadius: "24px",
              padding: "24px",
              border: `1px solid ${rgba(BRAND_RGB.sky, 0.22)}`,
              background: rgba(BRAND_RGB.deepNavy, 0.4),
              boxShadow: `0 18px 45px ${rgba(BRAND_RGB.deepNavy, 0.35)}`,
              backdropFilter: "blur(16px)",
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
              style={{
                position: "relative",
                width: "100%",
                padding: "32px",
                borderRadius: "32px",
                background: `radial-gradient(circle at top, ${
                  rgba(BRAND_RGB.sky, 0.25)
                }, transparent 65%)`,
                overflow: "hidden",
                perspective: 1400,
              }}
            >
              <motion.div
                animate={{ opacity: [0.45, 0.7, 0.45] }}
                transition={{
                  repeat: Infinity,
                  duration: 6,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  inset: "12%",
                  borderRadius: "999px",
                  background: `radial-gradient(circle, ${
                    rgba(BRAND_RGB.blue, 0.5)
                  }, transparent 70%)`,
                  filter: "blur(60px)",
                  pointerEvents: "none",
                }}
              />
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "32px",
                  border: `1px solid ${rgba(BRAND_RGB.sky, 0.18)}`,
                  pointerEvents: "none",
                  opacity: floatOpacity,
                }}
              />

              {orderedCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  style={{
                    position: "relative",
                    zIndex: cardTransforms[index]?.zIndex ?? 1,
                    borderRadius: "28px",
                    padding: "24px",
                    background: card.gradient,
                    color: "white",
                    boxShadow: `0 30px 80px ${rgba(BRAND_RGB.deepNavy, 0.35)}`,
                    transformStyle: "preserve-3d",
                    ...cardTransforms[index]?.style,
                    marginTop: index === 0 ? 0 : -80,
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
                      <Text variant="heading-strong-m">{card.metricValue}</Text>
                    </Row>
                    <Text variant="body-default-m">{card.description}</Text>
                  </Column>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </Column>
      </Row>
    </Column>
  );
}
