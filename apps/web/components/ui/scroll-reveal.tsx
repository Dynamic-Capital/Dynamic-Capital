"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  stagger?: boolean;
  staggerDelay?: number;
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className,
  stagger = false,
  staggerDelay = 0.1,
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shouldReduceMotion = useReducedMotion();

  const directionOffsets = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  if (shouldReduceMotion) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  const variants = {
    hidden: {
      opacity: 0,
      ...directionOffsets[direction],
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.21, 1.11, 0.81, 0.99] as any,
        ...(stagger && {
          staggerChildren: staggerDelay,
          delayChildren: delay,
        }),
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={cn("will-change-transform", className)}
    >
      {stagger
        ? (
          React.Children.map(children, (child, index) => (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              key={index}
            >
              {child}
            </motion.div>
          ))
        )
        : children}
    </motion.div>
  );
}
