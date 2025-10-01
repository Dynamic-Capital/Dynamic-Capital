"use client";

import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/utils";

// 3D Interactive Card with tilt and hover effects
interface Interactive3DCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  perspective?: number;
  scale?: number;
  glowEffect?: boolean;
  magneticEffect?: boolean;
  onClick?: () => void;
}

export function Interactive3DCard({
  children,
  className = "",
  intensity = 0.15,
  perspective = 1000,
  scale = 1.05,
  glowEffect = true,
  magneticEffect = false,
  onClick,
}: Interactive3DCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [
    intensity * 30,
    -intensity * 30,
  ]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [
    -intensity * 30,
    intensity * 30,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={cn("relative cursor-pointer", className)}
      style={{
        perspective: `${perspective}px`,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="relative w-full h-full rounded-xl overflow-hidden"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={{
          scale: isHovered ? scale : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        {/* Glow effect */}
        {glowEffect && (
          <motion.div
            className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-xl opacity-0 blur-sm"
            animate={{
              opacity: isHovered ? 0.4 : 0,
            }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Content */}
        <motion.div
          className="relative bg-card border border-border rounded-xl p-6 h-full backdrop-blur-xl"
          style={{
            transform: "translateZ(50px)",
          }}
        >
          {children}
        </motion.div>

        {/* Reflection overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-xl pointer-events-none"
          animate={{
            opacity: isHovered ? 0.2 : 0,
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  );
}

// Magnetic Card with attraction effect
interface MagneticCardProps {
  children: React.ReactNode;
  className?: string;
  magneticStrength?: number;
  onClick?: () => void;
}

export function MagneticCard({
  children,
  className = "",
  magneticStrength = 0.4,
  onClick,
}: MagneticCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * magneticStrength;
    const deltaY = (e.clientY - centerY) * magneticStrength;

    x.set(deltaX);
    y.set(deltaY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={cn("cursor-pointer", className)}
      style={{ x: mouseX, y: mouseY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="motion-card p-6 rounded-xl border border-border bg-card/50 backdrop-blur-xl">
        {children}
      </div>
    </motion.div>
  );
}

// Parallax Scroll Card
interface ParallaxCardProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
  scale?: number;
}

export function ParallaxCard({
  children,
  className = "",
  offset = 50,
  scale = 0.95,
}: ParallaxCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-10%" });

  const y = useTransform(
    useMotionValue(0),
    [0, 1],
    [offset, -offset],
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y }}
      initial={{ opacity: 0, scale }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="motion-card p-6 rounded-xl border border-border bg-card backdrop-blur-xl">
        {children}
      </div>
    </motion.div>
  );
}

// Morphing Card with shape changes
interface MorphingCardProps {
  children: React.ReactNode;
  className?: string;
  shapes?: string[];
  duration?: number;
}

export function MorphingCard({
  children,
  className = "",
  shapes = ["20%", "50%", "20%"],
  duration = 4,
}: MorphingCardProps) {
  return (
    <motion.div
      className={cn("relative overflow-hidden", className)}
      animate={{
        borderRadius: shapes,
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="motion-card p-6 border border-border bg-card backdrop-blur-xl h-full">
        {children}
      </div>
    </motion.div>
  );
}

// Liquid Card with blob-like animations
interface LiquidCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export function LiquidCard({
  children,
  className = "",
  color = "hsl(var(--primary))",
}: LiquidCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <motion.div
        className="absolute inset-0 opacity-10"
        style={{
          background:
            `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
        }}
        animate={{
          background: [
            `radial-gradient(circle at 20% 50%, ${color} 0%, transparent 70%)`,
            `radial-gradient(circle at 80% 30%, ${color} 0%, transparent 70%)`,
            `radial-gradient(circle at 40% 80%, ${color} 0%, transparent 70%)`,
            `radial-gradient(circle at 20% 50%, ${color} 0%, transparent 70%)`,
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="relative motion-card p-6 border border-border bg-card/80 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}

// Floating Action Card
interface FloatingActionCardProps {
  children: React.ReactNode;
  className?: string;
  floatIntensity?: number;
  rotateIntensity?: number;
}

export function FloatingActionCard({
  children,
  className = "",
  floatIntensity = 10,
  rotateIntensity = 2,
}: FloatingActionCardProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-floatIntensity, floatIntensity, -floatIntensity],
        rotate: [-rotateIntensity, rotateIntensity, -rotateIntensity],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{
        y: -floatIntensity * 2,
        scale: 1.05,
        transition: { duration: 0.3 },
      }}
    >
      <div className="motion-card p-6 rounded-xl border border-border bg-card backdrop-blur-xl shadow-lg">
        {children}
      </div>
    </motion.div>
  );
}

// Ripple Card with click ripple effect
interface RippleCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function RippleCard({
  children,
  className = "",
  onClick,
}: RippleCardProps) {
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
    }, 600);

    onClick?.();
  };

  return (
    <motion.div
      className={cn("relative overflow-hidden cursor-pointer", className)}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="motion-card p-6 rounded-xl border border-border bg-card backdrop-blur-xl">
        {children}
      </div>

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            className="absolute pointer-events-none"
            style={{
              left: ripple.x - 25,
              top: ripple.y - 25,
              width: 50,
              height: 50,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-full h-full bg-primary/30 rounded-full" />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// Staggered Grid Container for cards
interface StaggeredGridProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  columns?: number;
}

export function StaggeredGrid({
  children,
  className = "",
  staggerDelay = 0.1,
  columns = 3,
}: StaggeredGridProps) {
  return (
    <motion.div
      className={cn(
        `grid gap-6`,
        `grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns}`,
        className,
      )}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: {
              opacity: 0,
              y: 50,
              scale: 0.9,
            },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 100,
                damping: 12,
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
