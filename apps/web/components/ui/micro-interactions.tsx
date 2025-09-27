"use client";

import React, { useState } from "react";
import {
  AnimatePresence,
  motion,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/utils";

// Enhanced Button with micro-interactions
interface MicroButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "glass" | "glow" | "magnetic";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

export function MicroButton({
  children,
  className = "",
  variant = "default",
  size = "md",
  disabled = false,
  onClick,
  loading = false,
}: MicroButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const springConfig = { stiffness: 300, damping: 25 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "magnetic" && !disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * 0.3;
      const deltaY = (e.clientY - centerY) * 0.3;

      x.set(deltaX);
      y.set(deltaY);
      scale.set(1.05);
    }

    setMousePosition({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm h-8",
    md: "px-4 py-2 text-sm h-10",
    lg: "px-6 py-3 text-base h-12",
  };

  const variantClasses = {
    default: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
    glass: "glass-button backdrop-blur-xl border border-primary/20",
    glow:
      "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.5)]",
    magnetic:
      "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30",
  };

  return (
    <motion.button
      className={cn(
        "relative overflow-hidden rounded-lg font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      style={{ x, y, scale }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.95 }}
    >
      {/* Ripple effect */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-full"
            style={{
              left: mousePosition.x - 50,
              top: mousePosition.y - 50,
              width: 100,
              height: 100,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Glow effect for glow variant */}
      {variant === "glow" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-lg"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        {children}
      </span>
    </motion.button>
  );
}

// Enhanced Card with hover effects
interface MicroCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "elevated" | "glow" | "tilt";
  onClick?: () => void;
}

export function MicroCard({
  children,
  className = "",
  variant = "default",
  onClick,
}: MicroCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (variant === "tilt") {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rotateXValue = (e.clientY - centerY) / 10;
      const rotateYValue = (centerX - e.clientX) / 10;

      setRotateX(rotateXValue);
      setRotateY(rotateYValue);
    }
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const variantClasses = {
    default: "motion-card",
    glass: "glass-motion-card backdrop-blur-xl",
    elevated: "motion-card shadow-xl hover:shadow-2xl",
    glow: "motion-card-glow",
    tilt: "motion-card transform-gpu",
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl p-6 transition-all duration-300 cursor-pointer",
        variantClasses[variant],
        className,
      )}
      style={variant === "tilt"
        ? {
          transform:
            `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        }
        : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{
        scale: variant === "tilt" ? 1 : 1.02,
        y: variant === "tilt" ? 0 : -5,
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {variant === "glow" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.01, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Floating Action Button with pulse effect
interface FloatingActionButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  pulse?: boolean;
}

export function FloatingActionButton({
  children,
  className = "",
  onClick,
  pulse = true,
}: FloatingActionButtonProps) {
  return (
    <motion.button
      className={cn(
        "fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg",
        "flex items-center justify-center z-50",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
        className,
      )}
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
      animate={pulse
        ? {
          scale: [1, 1.05, 1],
          boxShadow: [
            "0 4px 15px rgba(0,0,0,0.1)",
            "0 8px 25px rgba(0,0,0,0.2)",
            "0 4px 15px rgba(0,0,0,0.1)",
          ],
        }
        : undefined}
      transition={pulse
        ? {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }
        : undefined}
    >
      {children}
    </motion.button>
  );
}

// Enhanced Input with focus animations
interface MicroInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}

export function MicroInput({
  label,
  error,
  icon,
  className = "",
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: MicroInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  return (
    <div className="relative">
      {label && (
        <motion.label
          className={cn(
            "absolute left-3 transition-all duration-200 pointer-events-none",
            isFocused || hasValue
              ? "top-1 text-xs text-primary"
              : "top-3 text-sm text-muted-foreground",
          )}
          animate={{
            y: isFocused || hasValue ? -8 : 0,
            scale: isFocused || hasValue ? 0.85 : 1,
            color: isFocused
              ? "hsl(var(--primary))"
              : "hsl(var(--muted-foreground))",
          }}
        >
          {label}
        </motion.label>
      )}

      <div className="relative">
        {icon && (
          <motion.div
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            animate={{
              color: isFocused
                ? "hsl(var(--primary))"
                : "hsl(var(--muted-foreground))",
              scale: isFocused ? 1.1 : 1,
            }}
          >
            {icon}
          </motion.div>
        )}

        <motion.input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-3 bg-background border border-border rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "transition-colors duration-200",
            icon && "pl-10",
            label && "pt-5 pb-2",
            error &&
              "border-destructive focus:border-destructive focus:ring-destructive/20",
            className,
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            setHasValue(!!e.target.value);
          }}
          onChange={(e) => {
            setHasValue(!!e.target.value);
            onChange?.(e);
          }}
          whileFocus={{ scale: 1.01 }}
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            className="text-xs text-destructive mt-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
