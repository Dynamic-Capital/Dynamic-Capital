"use client";

import React from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { cn } from "@/utils";
import { Card, CardContent } from "./card";

interface StackCardProps {
  children: React.ReactNode;
  className?: string;
  stackSize?: number;
  spreadOnHover?: boolean;
  rotateOnHover?: boolean;
  scaleOnHover?: boolean;
  stackOffset?: number;
  stackRotation?: number;
  depth?: number;
}

export function StackCard({
  children,
  className,
  stackSize = 3,
  spreadOnHover = true,
  rotateOnHover = true,
  scaleOnHover = true,
  stackOffset = 4,
  stackRotation = 2,
  depth = 20,
}: StackCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Background stack cards */}
      {Array.from({ length: stackSize - 1 }).map((_, index) => (
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{
            x: -(stackOffset * (stackSize - index - 1)),
            y: -(stackOffset * (stackSize - index - 1)),
            rotate: -(stackRotation * (stackSize - index - 1)),
            scale: 1 - (0.02 * (stackSize - index - 1)),
            zIndex: -(stackSize - index),
          }}
          animate={{
            x: isHovered && spreadOnHover
              ? -(stackOffset * (stackSize - index - 1) * 2)
              : -(stackOffset * (stackSize - index - 1)),
            y: isHovered && spreadOnHover
              ? -(stackOffset * (stackSize - index - 1) * 2)
              : -(stackOffset * (stackSize - index - 1)),
            rotate: isHovered && rotateOnHover
              ? -(stackRotation * (stackSize - index - 1) * 2)
              : -(stackRotation * (stackSize - index - 1)),
            scale: isHovered && scaleOnHover
              ? 1 - (0.01 * (stackSize - index - 1))
              : 1 - (0.02 * (stackSize - index - 1)),
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
        >
          <Card className="h-full w-full bg-card/80 border-border/50 backdrop-blur-sm">
            <CardContent className="h-full w-full" />
          </Card>
        </motion.div>
      ))}

      {/* Main card */}
      <motion.div
        className="relative z-10"
        style={{
          rotateX: rotateOnHover ? rotateX : 0,
          rotateY: rotateOnHover ? rotateY : 0,
        }}
        animate={{
          scale: isHovered && scaleOnHover ? 1.05 : 1,
          z: isHovered ? depth : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
        }}
      >
        <Card className="h-full w-full border-border/20 bg-card/90 backdrop-blur-md shadow-xl hover:shadow-2xl transition-shadow duration-300">
          {children}
        </Card>
      </motion.div>
    </div>
  );
}

interface AnimatedStackProps {
  items: React.ReactNode[];
  className?: string;
  direction?: "horizontal" | "vertical";
  autoPlay?: boolean;
  interval?: number;
}

export function AnimatedStack({
  items,
  className,
  direction = "vertical",
  autoPlay = false,
  interval = 3000,
}: AnimatedStackProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, items.length]);

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {items.map((item, index) => {
          const isActive = index === currentIndex;
          const offset = index - currentIndex;

          return (
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={{
                opacity: 0,
                x: direction === "horizontal" ? offset * 100 : 0,
                y: direction === "vertical" ? offset * 20 : 0,
                scale: 0.9,
                rotateY: direction === "horizontal" ? offset * 45 : 0,
              }}
              animate={{
                opacity: isActive ? 1 : Math.max(0, 1 - Math.abs(offset) * 0.3),
                x: direction === "horizontal" ? offset * 50 : 0,
                y: direction === "vertical" ? offset * 10 : 0,
                scale: isActive ? 1 : Math.max(0.8, 1 - Math.abs(offset) * 0.1),
                rotateY: direction === "horizontal" ? offset * 25 : 0,
                zIndex: items.length - Math.abs(offset),
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                x: direction === "horizontal" ? -100 : 0,
                y: direction === "vertical" ? -20 : 0,
              }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {item}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
