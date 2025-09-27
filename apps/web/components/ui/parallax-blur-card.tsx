"use client";

import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/utils";

/**
 * ParallaxBlurCard combines a parallax scrolling gradient backdrop with a blurred glass surface.
 *
 * @param blur - strength of the backdrop blur in pixels
 * @param gradientStart - Tailwind class for the gradient start color
 * @param gradientEnd - Tailwind class for the gradient end color
 * @param scale - hover scale factor for the card content
 */
export interface ParallaxBlurCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: number;
  gradientStart?: string;
  gradientEnd?: string;
  scale?: number;
}

export function ParallaxBlurCard({
  children,
  className,
  blur = 20,
  gradientStart = "from-primary/20 dark:from-primary/10",
  gradientEnd = "to-accent/20 dark:to-accent/10",
  scale = 1.05,
}: ParallaxBlurCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]); // Parallax offset

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden rounded-xl", className)}
    >
      {/* Parallax gradient background */}
      <motion.div
        style={{ y }}
        className={cn(
          "absolute inset-0 pointer-events-none bg-gradient-to-br",
          gradientStart,
          gradientEnd,
        )}
      />

      {/* Content with backdrop blur */}
      <motion.div
        className="relative p-6 backdrop-blur"
        style={{ backdropFilter: `blur(${blur}px)` }}
        whileHover={{ scale }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default ParallaxBlurCard;
