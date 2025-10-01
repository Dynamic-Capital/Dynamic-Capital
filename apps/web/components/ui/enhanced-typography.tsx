"use client";

import * as React from "react";
import type { JSX } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";

interface AnimatedHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  gradient?: boolean;
  glow?: boolean;
  typewriter?: boolean;
  delay?: number;
}

export const AnimatedHeading: React.FC<AnimatedHeadingProps> = ({
  children,
  level = 2,
  className = "",
  gradient = false,
  glow = false,
  typewriter = false,
  delay = 0,
}) => {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;

  const baseClasses = {
    1: "text-4xl md:text-5xl font-bold",
    2: "text-3xl md:text-4xl font-bold",
    3: "text-2xl md:text-3xl font-semibold",
    4: "text-xl md:text-2xl font-semibold",
    5: "text-lg md:text-xl font-medium",
    6: "text-base md:text-lg font-medium",
  };

  const gradientClass = gradient
    ? "bg-gradient-to-r from-primary via-brand-secondary to-primary bg-clip-text text-transparent"
    : "";
  const glowClass = glow
    ? "drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      {React.createElement(
        Component,
        {
          className: cn(
            baseClasses[level],
            gradientClass,
            glowClass,
            className,
          ),
        },
        typewriter ? <TypewriterText text={children as string} /> : children,
      )}
    </motion.div>
  );
};

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  delay = 0,
}) => {
  const [displayText, setDisplayText] = React.useState("");
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          setDisplayText((prev) => prev + text[currentIndex]);
          setCurrentIndex((prev) => prev + 1);
        }, speed);
        return () => clearTimeout(timeout);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [currentIndex, text, speed, delay]);

  return (
    <span>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-0.5 h-[1em] bg-current ml-1"
      />
    </span>
  );
};

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = "",
  colors = "from-primary via-brand-secondary to-primary",
}) => {
  return (
    <span
      className={cn(
        `bg-gradient-to-r ${colors} bg-clip-text text-transparent`,
        className,
      )}
    >
      {children}
    </span>
  );
};

interface PulsingTextProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export const PulsingText: React.FC<PulsingTextProps> = ({
  children,
  className = "",
  duration = 2,
}) => {
  return (
    <motion.span
      animate={{
        scale: [1, 1.05, 1],
        textShadow: [
          "0 0 0px rgba(var(--primary-rgb), 0)",
          "0 0 10px rgba(var(--primary-rgb), 0.5)",
          "0 0 0px rgba(var(--primary-rgb), 0)",
        ],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.span>
  );
};

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 2,
  suffix = "",
  prefix = "",
  className = "",
}) => {
  const [count, setCount] = React.useState(start);

  React.useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (endTime - startTime), 1);
      const currentCount = Math.floor(start + (end - start) * progress);

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };

    requestAnimationFrame(updateCount);
  }, [end, start, duration]);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className={className}
    >
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </motion.span>
  );
};

export default {
  AnimatedHeading,
  GradientText,
  PulsingText,
  CountUp,
};
