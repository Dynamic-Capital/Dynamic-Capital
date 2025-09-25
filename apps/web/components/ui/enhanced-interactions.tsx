"use client";

import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/utils";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
  disabled?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = "",
  strength = 0.4,
  onClick,
  disabled = false,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className,
      )}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
};

interface PulseRingProps {
  color?: string;
  size?: number;
  className?: string;
}

export const PulseRing: React.FC<PulseRingProps> = ({
  color = "hsl(var(--primary))",
  size = 100,
  className = "",
}) => {
  return (
    <div className={cn("relative", className)}>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 opacity-30"
          style={{
            borderColor: color,
            width: size,
            height: size,
            left: "50%",
            top: "50%",
            x: "-50%",
            y: "-50%",
          }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

interface FloatingElementsProps {
  count?: number;
  className?: string;
  children?: React.ReactNode;
}

export const FloatingElements: React.FC<FloatingElementsProps> = ({
  count = 5,
  className = "",
  children,
}) => {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
      {children}
    </div>
  );
};

interface HoverGlowProps {
  children: React.ReactNode;
  color?: string;
  intensity?: number;
  className?: string;
}

export const HoverGlow: React.FC<HoverGlowProps> = ({
  children,
  color = "hsl(var(--primary))",
  intensity = 0.3,
  className = "",
}) => {
  return (
    <motion.div
      className={cn("relative", className)}
      whileHover={{
        boxShadow: `0 0 20px ${color}${
          Math.floor(intensity * 255).toString(16)
        }`,
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

interface MorphingShapeProps {
  className?: string;
  color?: string;
  speed?: number;
}

export const MorphingShape: React.FC<MorphingShapeProps> = ({
  className = "",
  color = "hsl(var(--primary))",
  speed = 4,
}) => {
  return (
    <motion.div
      className={cn("absolute opacity-10", className)}
      animate={{
        borderRadius: [
          "60% 40% 30% 70%/60% 30% 70% 40%",
          "30% 60% 70% 40%/50% 60% 30% 60%",
          "60% 40% 30% 70%/60% 30% 70% 40%",
        ],
        rotate: [0, 360],
      }}
      transition={{
        duration: speed,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        background: `linear-gradient(45deg, ${color}, transparent)`,
        width: "100%",
        height: "100%",
      }}
    />
  );
};

interface SuccessRippleProps {
  trigger: boolean;
  onComplete?: () => void;
  color?: string;
}

export const SuccessRipple: React.FC<SuccessRippleProps> = ({
  trigger,
  onComplete,
  color = "hsl(var(--success))",
}) => {
  React.useEffect(() => {
    if (trigger && onComplete) {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 2, opacity: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div
        className="w-full h-full rounded-full border-4"
        style={{ borderColor: color }}
      />
    </motion.div>
  );
};

export default {
  MagneticButton,
  PulseRing,
  FloatingElements,
  HoverGlow,
  MorphingShape,
  SuccessRipple,
};
