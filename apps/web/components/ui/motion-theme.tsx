"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/utils";
import { MotionConfigProvider } from "./motion-config";
import {
  DYNAMIC_MOTION_DURATIONS,
  DYNAMIC_MOTION_SPRINGS,
  dynamicMotionVariants,
} from "@/lib/motion-variants";
import { SectionVariant, sectionVariants } from "@/lib/section-variants";
import { useIsMobile } from "@/hooks/useMobile";

interface MotionThemeProviderProps {
  children: React.ReactNode;
  className?: string;
  reducedMotion?: boolean;
}

export const MotionThemeProvider: React.FC<MotionThemeProviderProps> = ({
  children,
  className,
  reducedMotion = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isReduced = reducedMotion || prefersReducedMotion;
  const containerVariants = isReduced
    ? dynamicMotionVariants.fadeIn
    : dynamicMotionVariants.stack;

  return (
    <MotionConfigProvider>
      <motion.div
        className={cn(
          "motion-theme-provider",
          "min-h-screen",
          "transition-all duration-500 ease-out",
          className,
        )}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, hsl(var(--accent) / 0.05) 0%, transparent 50%),
            linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)
          `,
        }}
      >
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </motion.div>
    </MotionConfigProvider>
  );
};

// Page wrapper with consistent animations
interface MotionPageProps {
  children: React.ReactNode;
  className?: string;
  pageKey?: string;
}

export const MotionPage: React.FC<MotionPageProps> = ({
  children,
  className,
  pageKey = "page",
}) => {
  return (
    <motion.div
      key={pageKey}
      className={cn("motion-page", className)}
      variants={dynamicMotionVariants.stackItem}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
};

// Section wrapper with viewport animations
interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  viewport?: {
    once?: boolean;
    amount?: number;
  };
  variant?: SectionVariant;
  id?: string;
}

export const MotionSection: React.FC<MotionSectionProps> = ({
  children,
  className,
  delay = 0,
  viewport = { once: true, amount: 0.2 },
  variant = "fadeUp",
  id,
}) => {
  const isMobile = useIsMobile();
  const selectedVariant = sectionVariants[variant] || sectionVariants.fadeUp;
  const spring = isMobile
    ? { ...DYNAMIC_MOTION_SPRINGS.base, stiffness: 300, damping: 25 }
    : DYNAMIC_MOTION_SPRINGS.base;
  return (
    <motion.section
      id={id}
      className={cn("motion-section", className)}
      variants={selectedVariant}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      transition={{
        ...spring,
        delay,
      }}
    >
      {children}
    </motion.section>
  );
};

// Grid container with stagger animations
interface MotionGridProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  columns?: number;
}

export const MotionGrid: React.FC<MotionGridProps> = ({
  children,
  className,
  staggerDelay = 0.1,
  columns = 1,
}) => {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }[columns] || "grid-cols-1";

  return (
    <motion.div
      className={cn("grid gap-6", gridClass, className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={dynamicMotionVariants.staggerContainer}
      transition={{
        staggerChildren: staggerDelay,
        delayChildren: DYNAMIC_MOTION_DURATIONS.instant,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={dynamicMotionVariants.stackItem}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Button with consistent motion
interface MotionButtonWrapperProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const MotionButtonWrapper: React.FC<MotionButtonWrapperProps> = ({
  children,
  className,
  disabled = false,
}) => {
  return (
    <motion.div
      className={className}
      variants={dynamicMotionVariants.button}
      initial="initial"
      animate={disabled ? "disabled" : "initial"}
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
    >
      {children}
    </motion.div>
  );
};

// Modal wrapper with backdrop
interface MotionModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

export const MotionModal: React.FC<MotionModalProps> = ({
  children,
  isOpen,
  onClose,
  className,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            variants={dynamicMotionVariants.backdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-4",
              className,
            )}
            variants={dynamicMotionVariants.modal}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default {
  MotionThemeProvider,
  MotionPage,
  MotionSection,
  MotionGrid,
  MotionButtonWrapper,
  MotionModal,
};
