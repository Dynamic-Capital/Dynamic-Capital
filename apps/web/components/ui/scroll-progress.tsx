"use client";

import * as React from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { cn } from "@/utils";

interface ScrollProgressBarProps {
  className?: string;
  color?: string;
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  className,
  color = "hsl(var(--primary))",
}) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [showTop, setShowTop] = React.useState(false);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setShowTop(latest >= 1);
  });

  return (
    <>
      <motion.div
        className={cn(
          "fixed top-0 left-0 right-0 h-1 z-50 origin-left",
          className,
        )}
        style={{
          scaleX,
          backgroundColor: color,
        }}
      />
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          Back to Top
        </button>
      )}
    </>
  );
};

interface ParallaxElementProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
  speed?: number;
}

export const ParallaxElement: React.FC<ParallaxElementProps> = ({
  children,
  className,
  offset = 50,
  speed = 0.5,
}) => {
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y, opacity }}
    >
      {children}
    </motion.div>
  );
};

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  threshold = 0.3,
  once = true,
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: threshold }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 28,
      }}
    >
      {children}
    </motion.div>
  );
};
