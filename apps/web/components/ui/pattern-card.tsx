"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";
import { Card, CardContent } from "./card";

export type PatternType =
  | "dots"
  | "grid"
  | "diagonal"
  | "waves"
  | "circuit"
  | "hexagon"
  | "none";

interface PatternCardProps {
  children: React.ReactNode;
  className?: string;
  pattern?: PatternType;
  patternOpacity?: number;
  patternColor?: string;
  animated?: boolean;
  hover3d?: boolean;
}

export function PatternCard({
  children,
  className,
  pattern = "dots",
  patternOpacity = 0.1,
  patternColor = "currentColor",
  animated = false,
  hover3d = false,
}: PatternCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getPatternClass = () => {
    switch (pattern) {
      case "dots":
        return "pattern-dots";
      case "grid":
        return "pattern-grid";
      case "diagonal":
        return "pattern-diagonal";
      case "waves":
        return "pattern-waves";
      case "circuit":
        return "pattern-circuit";
      case "hexagon":
        return "pattern-hexagon";
      default:
        return "";
    }
  };

  const cardVariants = {
    initial: {
      scale: 1,
      rotateX: 0,
      rotateY: 0,
    },
    hover: {
      scale: hover3d ? 1.02 : 1,
      rotateX: hover3d ? 5 : 0,
      rotateY: hover3d ? 5 : 0,
    },
  };

  const patternVariants = {
    initial: {
      opacity: patternOpacity,
      scale: 1,
    },
    hover: {
      opacity: patternOpacity * 1.5,
      scale: animated ? 1.1 : 1,
    },
  };

  return (
    <motion.div
      className={cn("relative perspective-1000", className)}
      variants={cardVariants}
      initial="initial"
      animate={isHovered ? "hover" : "initial"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
    >
      <Card className="relative overflow-hidden border-border/20 bg-card/80 backdrop-blur-sm">
        {/* Pattern overlay */}
        {pattern !== "none" && (
          <motion.div
            className={cn(
              "absolute inset-0 z-0",
              getPatternClass(),
            )}
            style={{
              color: patternColor,
            }}
            variants={patternVariants}
            initial="initial"
            animate={isHovered ? "hover" : "initial"}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </Card>
    </motion.div>
  );
}

interface GlowPatternCardProps extends PatternCardProps {
  glowColor?: string;
  glowIntensity?: number;
}

export function GlowPatternCard({
  glowColor = "hsl(var(--primary))",
  glowIntensity = 0.3,
  className,
  children,
  ...props
}: GlowPatternCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 rounded-lg blur-sm"
        style={{
          background:
            `linear-gradient(45deg, ${glowColor}, transparent, ${glowColor})`,
        }}
        animate={{
          opacity: isHovered ? glowIntensity : 0,
        }}
        transition={{ duration: 0.3 }}
      />

      <PatternCard
        {...props}
        className="relative"
        hover3d={true}
        animated={true}
      >
        {children}
      </PatternCard>
    </motion.div>
  );
}
