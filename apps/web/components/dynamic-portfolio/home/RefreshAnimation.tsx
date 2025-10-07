"use client";

import { type ComponentType, memo, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils";

import type { InteractiveAsciiProps } from "@/components/landing/InteractiveAscii";
import styles from "./RefreshAnimation.module.css";

type InteractiveAsciiComponent = ComponentType<InteractiveAsciiProps>;

type RefreshAnimationProps = {
  active: boolean;
  ariaLabel?: string;
  className?: string;
};

const ASCII_PRESET = {
  backgroundColor: "transparent",
  outputWidth: 68,
  brightness: 11,
  contrast: 19,
  ditheringMode: "ordered",
  characterSet: "detailed",
  color: {
    mode: "gradient",
    color1: "#0098EA",
    color1Point: 14,
    color2: "#00F0FF",
    color2Point: 88,
  },
  cursor: {
    style: "gradient",
    width: 16,
    smoothing: 26,
    invert: false,
  },
  glow: { blur: 18, opacity: 0.28 },
  staticEffect: { interval: 0.32 },
  font: { fontSize: "10px", lineHeight: "1.08em", fontWeight: 600 },
} satisfies Partial<InteractiveAsciiProps>;

function RefreshAnimationComponent({
  active,
  ariaLabel = "Live data refreshing",
  className,
}: RefreshAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const [interactiveAscii, setInteractiveAscii] = useState<
    InteractiveAsciiComponent | null
  >(null);

  useEffect(() => {
    if (!active || prefersReducedMotion || interactiveAscii) {
      return;
    }

    let cancelled = false;

    void import("@/components/landing/InteractiveAscii").then((module) => {
      if (!cancelled) {
        setInteractiveAscii(() => module.InteractiveAscii);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [active, interactiveAscii, prefersReducedMotion]);

  const Ascii = interactiveAscii;
  const hasAscii = Ascii !== null;
  const label = ariaLabel;

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <span className={cn(styles.frame, className)}>
      <span className={styles.glow} aria-hidden="true" />
      <AnimatePresence initial={false} mode="wait">
        {hasAscii && active
          ? (
            <motion.span
              key="refresh-ascii"
              className={styles.animation}
              role="img"
              aria-label={label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <Ascii className={styles.canvas} {...ASCII_PRESET} />
            </motion.span>
          )
          : active
          ? (
            <motion.span
              key="refresh-placeholder"
              className={styles.placeholder}
              role="img"
              aria-label={label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          )
          : null}
      </AnimatePresence>
    </span>
  );
}

export const RefreshAnimation = memo(RefreshAnimationComponent);

export type { RefreshAnimationProps };
