"use client";

import React from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { cn } from "@/utils";

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
  variant?: "fade" | "slide" | "scale" | "bounce";
  delay?: number;
  duration?: number;
}

const pageVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
  bounce: {
    initial: { opacity: 0, y: 50, scale: 0.8 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -50, scale: 0.8 },
  },
};

export const AnimatedPage: React.FC<AnimatedPageProps> = ({
  children,
  className,
  variant = "fade",
  delay = 0,
  duration = 0.5,
}) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const controls = useAnimation();

  React.useEffect(() => {
    if (isInView) {
      controls.start("animate");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      className={cn("w-full", className)}
      variants={pageVariants[variant]}
      initial="initial"
      animate={controls}
      exit="exit"
      transition={{
        duration,
        delay,
        type: variant === "bounce" ? "spring" : "tween",
        stiffness: variant === "bounce" ? 260 : undefined,
        damping: variant === "bounce" ? 20 : undefined,
        ease: variant !== "bounce"
          ? [0.6, -0.05, 0.01, 0.99] as [number, number, number, number]
          : undefined,
      }}
    >
      {children}
    </motion.div>
  );
};

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  direction?: "vertical" | "horizontal";
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  staggerDelay = 0.1,
  direction = "vertical",
}) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: direction === "vertical" ? 20 : 0,
      x: direction === "horizontal" ? 20 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.5,
        ease: [0.6, -0.05, 0.01, 0.99] as [number, number, number, number],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
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

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  intensity?: "subtle" | "medium" | "strong";
  duration?: number;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  className,
  intensity = "medium",
  duration = 3,
}) => {
  const intensityMap = {
    subtle: { y: [-2, 2], rotate: [-0.5, 0.5] },
    medium: { y: [-5, 5], rotate: [-1, 1] },
    strong: { y: [-10, 10], rotate: [-2, 2] },
  };

  return (
    <motion.div
      className={className}
      animate={{
        y: intensityMap[intensity].y,
        rotate: intensityMap[intensity].rotate,
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;
