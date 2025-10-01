"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";
import { useIsMobile } from "@/hooks/useMobile";

export interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "default"
    | "glass"
    | "elevated"
    | "interactive"
    | "glow"
    | "minimal";
  hover?: boolean;
  animate?: boolean;
  delay?: number;
  onClick?: () => void;
}

const variantStyles = {
  default: "motion-card",
  glass: "glass-motion-card",
  elevated: "motion-card shadow-xl",
  interactive: "motion-card-interactive",
  glow: "motion-card-glow",
  minimal: "bg-transparent border-0 shadow-none",
};

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  (
    {
      className,
      variant = "default",
      hover = true,
      animate = true,
      delay = 0,
      children,
      onClick,
    },
    ref,
  ) => {
    const isMobile = useIsMobile();

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl p-6 transition-all duration-300",
          variantStyles[variant],
          className,
        )}
        variants={{
          hidden: {
            opacity: 0,
            y: isMobile ? 10 : 20,
            scale: isMobile ? 0.98 : 0.95,
          },
          visible: { opacity: 1, y: 0, scale: 1 },
        }}
        initial={animate ? "hidden" : undefined}
        whileInView={animate ? "visible" : undefined}
        viewport={{ once: true, amount: 0.2 }}
        whileHover={hover && !isMobile ? { scale: 1.03, y: -4 } : undefined}
        whileTap={hover && !isMobile ? { scale: 0.97 } : undefined}
        layout
        transition={{
          delay,
          type: "spring",
          stiffness: isMobile ? 300 : 260,
          damping: isMobile ? 25 : 20,
        }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  },
);
MotionCard.displayName = "MotionCard";

const MotionCardContainer = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string; staggerDelay?: number }
>(
  ({ className, staggerDelay = 0.1, children }, ref) => (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
        },
      }}
    >
      {children}
    </motion.div>
  ),
);
MotionCardContainer.displayName = "MotionCardContainer";

export { MotionCard, MotionCardContainer };
