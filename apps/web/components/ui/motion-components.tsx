"use client";

import React from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "@/utils";

interface MotionFadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  scale?: boolean;
  once?: boolean;
}

export const MotionFadeIn: React.FC<MotionFadeInProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.8,
  direction = "up",
  distance = 50,
  scale = false,
  once = true,
}) => {
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  const initialState = {
    opacity: 0,
    ...(scale && { scale: 0.9 }),
    ...directionMap[direction],
  };

  const animateState = {
    opacity: 1,
    ...(scale && { scale: 1 }),
    x: 0,
    y: 0,
  };

  return (
    <motion.div
      className={className}
      initial={initialState}
      whileInView={animateState}
      viewport={{ once, amount: 0.3 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // Enhanced easing
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  );
};

interface MotionStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export const MotionStagger: React.FC<MotionStaggerProps> = ({
  children,
  className,
  staggerDelay = 0.1,
  initialDelay = 0,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.6, -0.05, 0.01, 0.99] as [number, number, number, number],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {React.Children.map(
        children,
        (child, index) => (
          <motion.div key={index} variants={itemVariants}>
            {child}
          </motion.div>
        ),
      )}
    </motion.div>
  );
};

interface MotionCounterProps {
  from: number;
  to: number;
  duration?: number;
  delay?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export const MotionCounter: React.FC<MotionCounterProps> = ({
  from,
  to,
  duration = 2,
  delay = 0,
  className,
  suffix = "",
  prefix = "",
}) => {
  const value = useMotionValue(from);
  const [count, setCount] = React.useState(from);

  React.useEffect(() => {
    const controls = animate(value, to, { duration, delay });
    return controls.stop;
  }, [value, to, duration, delay]);

  useMotionValueEvent(value, "change", (latest) => {
    setCount(Math.round(latest));
  });

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </motion.span>
  );
};

interface MotionHoverCardProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  hoverRotate?: number;
  hoverY?: number;
  tapScale?: number;
}

export const MotionHoverCard: React.FC<MotionHoverCardProps> = ({
  children,
  className,
  hoverScale = 1.05,
  hoverRotate = 0,
  hoverY = -10,
  tapScale = 0.95,
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{
        scale: hoverScale,
        rotate: hoverRotate,
        y: hoverY,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25,
        },
      }}
      whileTap={{
        scale: tapScale,
        transition: { duration: 0.1 },
      }}
      transition={{
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  );
};

interface MotionScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export const MotionScrollReveal: React.FC<MotionScrollRevealProps> = ({
  children,
  className,
  threshold = 0.1,
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.8,
          ease: [0.6, -0.05, 0.01, 0.99],
        },
      }}
      viewport={{ once: true, amount: threshold }}
    >
      {children}
    </motion.div>
  );
};

interface MotionPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const MotionPageTransition: React.FC<MotionPageTransitionProps> = ({
  children,
  className,
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        ease: [0.6, -0.05, 0.01, 0.99],
      }}
    >
      {children}
    </motion.div>
  );
};

export default {
  MotionFadeIn,
  MotionStagger,
  MotionCounter,
  MotionHoverCard,
  MotionScrollReveal,
  MotionPageTransition,
};
