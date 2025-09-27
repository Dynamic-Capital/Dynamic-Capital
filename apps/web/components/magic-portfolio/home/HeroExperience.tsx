"use client";

import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
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
} from "@/components/dynamic-ui-system";
import { home } from "@/resources";
import { cn } from "@/utils";
import { useHeroMetrics } from "@/hooks/useHeroMetrics";
import { useDeskPreviewCards } from "@/hooks/useDeskPreviewCards";
import {
  DEFAULT_DESK_PREVIEW_CARDS,
  type DeskPreviewCard,
} from "@/services/deskPreviewCards";
import styles from "./HeroExperience.module.scss";

const ONBOARDING_STEPS = [
  {
    title: "Profile your objective",
    subtitle: "45-second intake calibrates the workspace",
    description:
      "Tell us your markets, schedule, and risk ceiling so we pre-load playbooks, alerts, and guardrails around your target.",
    actions: ["Markets & style", "Risk ceiling", "Session blocks"],
  },
  {
    title: "Rehearse with live cues",
    subtitle: "Coach-led drills align your routine",
    description:
      "Interactive timers, video prompts, and readiness scorecards walk you through every motion before capital is live.",
    actions: ["Mentor prompts", "Automation previews", "Readiness score"],
  },
  {
    title: "Trade with guardrails",
    subtitle: "Unlock the desk once you prove consistency",
    description:
      "Desk signals, auto-journaling, and escalation to humans activate the moment your readiness score clears the threshold.",
    actions: ["Signal unlock", "Risk throttles", "Mentor escalation"],
  },
] as const;

const brandColor = (token: string, alpha?: number) =>
  alpha === undefined ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;

const clampNormalizedPointer = (value: number) =>
  Math.max(-1, Math.min(1, value));

export function HeroExperience() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  const pointerBounds = useRef<DOMRect | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = ONBOARDING_STEPS[activeStepIndex];
  const stepButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const componentId = useId();
  const tablistId = `${componentId}-onboarding`;
  const instructionsId = `${tablistId}-instructions`;
  const detailActionsId = `${tablistId}-actions`;
  const prefersReducedMotion = useReducedMotion();
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
  const { heroMetrics } = useHeroMetrics();
  const {
    cards: previewCards,
    isLoading: cardsLoading,
    isError: cardsError,
    isFallback: cardsFallback,
  } = useDeskPreviewCards();
  const skeletonCards = DEFAULT_DESK_PREVIEW_CARDS;
  const showCardSkeleton = cardsLoading && previewCards.length === 0;
  const displayedCards = showCardSkeleton ? skeletonCards : previewCards;

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

  const cardCount = displayedCards.length;
  const activeCardIndex = cardCount
    ? activeStepIndex % cardCount
    : activeStepIndex;

  const orderedCards = useMemo<DeskPreviewCard[]>(() => {
    if (!cardCount) {
      return [];
    }

    const primaryCard = displayedCards[activeCardIndex];

    if (!primaryCard) {
      return displayedCards.slice();
    }

    return [
      primaryCard,
      ...displayedCards.filter((_, index) => index !== activeCardIndex),
    ];
  }, [activeCardIndex, cardCount, displayedCards]);

  const enableCardMotion = !prefersReducedMotion && !showCardSkeleton;
  const cardTransforms = useMemo(
    () => {
      if (!enableCardMotion) {
        return orderedCards.map((_, index) => ({
          style: { x: 0, y: 0, rotateX: "0deg", rotateY: "0deg" },
          zIndex: orderedCards.length - index,
        }));
      }

      return [
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
      ];
    },
    [
      backCardX,
      backCardY,
      backRotateX,
      backRotateY,
      enableCardMotion,
      middleCardX,
      middleCardY,
      middleRotateX,
      middleRotateY,
      orderedCards,
      primaryCardX,
      primaryCardY,
      primaryRotateX,
      primaryRotateY,
    ],
  );

  const updatePointerBounds = useCallback(() => {
    pointerBounds.current = previewSurfaceRef.current
      ? previewSurfaceRef.current.getBoundingClientRect()
      : null;
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || showCardSkeleton) {
        return;
      }

      if (!pointerBounds.current) {
        updatePointerBounds();
      }

      const bounds = pointerBounds.current;

      if (!bounds) {
        return;
      }

      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;

      pointerX.set(Number.isFinite(x) ? clampNormalizedPointer(x) : 0);
      pointerY.set(Number.isFinite(y) ? clampNormalizedPointer(y) : 0);
    },
    [
      pointerX,
      pointerY,
      prefersReducedMotion,
      showCardSkeleton,
      updatePointerBounds,
    ],
  );

  const resetPointer = useCallback(() => {
    pointerBounds.current = null;
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  useEffect(() => {
    updatePointerBounds();
  }, [updatePointerBounds]);

  useEffect(() => {
    window.addEventListener("resize", updatePointerBounds);
    return () => window.removeEventListener("resize", updatePointerBounds);
  }, [updatePointerBounds]);

  useEffect(() => {
    updatePointerBounds();
  }, [activeStepIndex, updatePointerBounds]);

  useEffect(() => {
    const handleScroll = () => {
      pointerBounds.current = null;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || showCardSkeleton) {
      resetPointer();
    }
  }, [prefersReducedMotion, resetPointer, showCardSkeleton]);

  const focusStepButton = useCallback((index: number) => {
    const focus = () => {
      const button = stepButtonRefs.current[index];
      button?.focus();
    };

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(focus);
      return;
    }

    focus();
  }, []);

  const updateActiveStep = useCallback(
    (nextIndex: number, options?: { focus?: boolean }) => {
      setActiveStepIndex((previousIndex) => {
        if (previousIndex === nextIndex) {
          return previousIndex;
        }

        return nextIndex;
      });

      if (options?.focus) {
        focusStepButton(nextIndex);
      }
    },
    [focusStepButton],
  );

  const stepHandlers = useMemo(
    () =>
      ONBOARDING_STEPS.map((_, index) => () => {
        updateActiveStep(index);
      }),
    [updateActiveStep],
  );

  const handleStepKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const lastIndex = ONBOARDING_STEPS.length - 1;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = index === lastIndex ? 0 : index + 1;
          updateActiveStep(nextIndex, { focus: true });
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          event.preventDefault();
          const nextIndex = index === 0 ? lastIndex : index - 1;
          updateActiveStep(nextIndex, { focus: true });
          break;
        }
        case "Home": {
          event.preventDefault();
          updateActiveStep(0, { focus: true });
          break;
        }
        case "End": {
          event.preventDefault();
          updateActiveStep(lastIndex, { focus: true });
          break;
        }
        default:
          break;
      }
    },
    [updateActiveStep],
  );

  const stepTabIds = useMemo(
    () =>
      ONBOARDING_STEPS.map((step, index) =>
        `${tablistId}-tab-${
          step.title.replace(/\s+/g, "-").toLowerCase()
        }-${index}`
      ),
    [tablistId],
  );

  const stepPanelIds = useMemo(
    () => ONBOARDING_STEPS.map((_, index) => `${tablistId}-panel-${index}`),
    [tablistId],
  );

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
            {heroMetrics.map((stat) => (
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
                    <Text
                      variant="heading-strong-m"
                      className={cn(stat.isFallback && "animate-pulse")}
                    >
                      {stat.value}
                    </Text>
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
              <Text
                id={instructionsId}
                onBackground="neutral-weak"
                variant="label-default-m"
              >
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
            role="tablist"
            aria-orientation="horizontal"
            aria-describedby={instructionsId}
            id={tablistId}
          >
            {ONBOARDING_STEPS.map((step, index) => {
              const isActive = activeStepIndex === index;

              return (
                <motion.button
                  key={step.title}
                  type="button"
                  ref={(node) => {
                    stepButtonRefs.current[index] = node;
                  }}
                  id={stepTabIds[index]}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={stepPanelIds[index]}
                  tabIndex={isActive ? 0 : -1}
                  onClick={stepHandlers[index]}
                  onKeyDown={(event) => handleStepKeyDown(event, index)}
                  whileHover={prefersReducedMotion
                    ? undefined
                    : { y: -4, scale: 1.01 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
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
            id={stepPanelIds[activeStepIndex]}
            role="tabpanel"
            aria-labelledby={stepTabIds[activeStepIndex]}
            aria-live="polite"
            aria-describedby={detailActionsId}
            tabIndex={0}
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
              id={detailActionsId}
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
            style={{ width: "100%", y: prefersReducedMotion ? 0 : floatY }}
          >
            <motion.div
              ref={previewSurfaceRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={resetPointer}
              className={styles.previewSurface}
              role="group"
              aria-describedby={`${tablistId}-preview`}
              aria-busy={showCardSkeleton}
              style={{
                background: `radial-gradient(circle at top, ${
                  brandColor("--dc-secondary", 0.25)
                }, transparent 65%)`,
                pointerEvents: showCardSkeleton ? "none" : undefined,
              }}
            >
              <motion.div
                aria-hidden="true"
                animate={{ opacity: [0.45, 0.7, 0.45] }}
                transition={{
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  duration: prefersReducedMotion ? 0 : 6,
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
                aria-hidden="true"
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
                      ...(cardTransforms[index]?.style ?? {}),
                      marginTop: index === 0 ? 0 : undefined,
                      opacity: showCardSkeleton ? 0.55 : 1,
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
          {showCardSkeleton
            ? (
              <Text
                variant="label-default-s"
                onBackground="neutral-medium"
                align="center"
              >
                Loading live desk preview…
              </Text>
            )
            : null}
          {!showCardSkeleton && (cardsError || cardsFallback)
            ? (
              <Text
                variant="label-default-s"
                onBackground="neutral-medium"
                align="center"
              >
                We&apos;re showing sample desk cards while the live data syncs.
              </Text>
            )
            : null}
          <Text
            id={`${tablistId}-preview`}
            className="sr-only"
            as="p"
          >
            Preview cards update to reflect the selected onboarding step.
          </Text>
        </Column>
      </Row>
    </Column>
  );
}
