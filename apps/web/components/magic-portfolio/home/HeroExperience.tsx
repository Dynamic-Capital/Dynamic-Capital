"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef } from "react";
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
  Row,
  Text,
} from "@once-ui-system/core";
import { home } from "@/resources";

const ONBOARDING_STEPS = [
  {
    title: "Guided setup",
    description:
      "Answer a few quick questions and we suggest the exact playbook that matches your goals and starting capital.",
  },
  {
    title: "Practice in a safe workspace",
    description:
      "Test the strategy in our sandbox first. Visual timers and checklists walk you through each trade with zero pressure.",
  },
  {
    title: "Go live with confidence",
    description:
      "Graduate into real positions with automated risk controls, instant feedback, and weekly office hours.",
  },
] as const;

const PREVIEW_CARDS = [
  {
    title: "Signal Room",
    subtitle: "Next setup in 2h 14m",
    metricLabel: "Target",
    metricValue: "+1.6%",
    description: "Entry 1.2450 · Risk 0.35%",
    gradient:
      "linear-gradient(135deg, rgba(129, 140, 248, 0.95) 0%, rgba(79, 70, 229, 0.85) 45%, rgba(30, 27, 75, 0.8) 100%)",
  },
  {
    title: "Mentor Check-in",
    subtitle: "Tonight · 20:00 GMT",
    metricLabel: "Confidence",
    metricValue: "High",
    description: "Bring your trade journal · Submit questions",
    gradient:
      "linear-gradient(135deg, rgba(56, 189, 248, 0.9) 0%, rgba(14, 165, 233, 0.75) 60%, rgba(15, 23, 42, 0.75) 100%)",
  },
  {
    title: "Risk Controls",
    subtitle: "Auto warm-up enabled",
    metricLabel: "Max loss",
    metricValue: "0.5%",
    description: "Daily guardrail locks if hit",
    gradient:
      "linear-gradient(135deg, rgba(252, 211, 77, 0.9) 0%, rgba(249, 115, 22, 0.85) 55%, rgba(88, 28, 135, 0.8) 100%)",
  },
] as const;

export function HeroExperience() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
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
      </Column>

      <Row
        gap="40"
        s={{ direction: "column" }}
        align="start"
        fillWidth
        maxWidth="xl"
      >
        <Column flex={3} gap="20">
          <Column as="ol" gap="16">
            {ONBOARDING_STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.6 + index * 0.08,
                  type: "spring",
                  stiffness: 180,
                  damping: 26,
                }}
                style={{ listStyle: "none" }}
              >
                <Column
                  background="surface"
                  border="neutral-alpha-medium"
                  radius="l"
                  padding="m"
                  gap="12"
                  shadow="m"
                >
                  <Row gap="12" vertical="center">
                    <Badge
                      background="brand-alpha-weak"
                      onBackground="brand-strong"
                      paddingX="12"
                      paddingY="2"
                      textVariant="label-default-s"
                    >
                      Step {index + 1}
                    </Badge>
                    <Text variant="heading-strong-s">{step.title}</Text>
                  </Row>
                  <Text onBackground="neutral-weak" variant="body-default-m">
                    {step.description}
                  </Text>
                </Column>
              </motion.li>
            ))}
          </Column>
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
                background:
                  "radial-gradient(circle at top, rgba(129, 140, 248, 0.25), transparent 65%)",
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
                  background:
                    "radial-gradient(circle, rgba(99, 102, 241, 0.5), transparent 70%)",
                  filter: "blur(60px)",
                  pointerEvents: "none",
                }}
              />
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "32px",
                  border: "1px solid rgba(129, 140, 248, 0.18)",
                  pointerEvents: "none",
                  opacity: floatOpacity,
                }}
              />

              {PREVIEW_CARDS.map((card, index) => (
                <motion.div
                  key={card.title}
                  style={{
                    position: "relative",
                    zIndex: cardTransforms[index]?.zIndex ?? 1,
                    borderRadius: "28px",
                    padding: "24px",
                    background: card.gradient,
                    color: "white",
                    boxShadow: "0 30px 80px rgba(15, 23, 42, 0.35)",
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
