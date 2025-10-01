"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils";

type MotionButtonProps = React.ComponentPropsWithoutRef<typeof motion.button>;

const enhancedInteractionButtonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden group",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-md hover:shadow-lg hover:shadow-primary/25",
          "hover:scale-105 active:scale-95",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        ],
        secondary: [
          "bg-secondary text-secondary-foreground",
          "shadow-sm hover:shadow-md",
          "hover:scale-105 active:scale-95",
        ],
        outline: [
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          "hover:border-primary/50 hover:shadow-md",
          "hover:scale-105 active:scale-95",
        ],
        ghost: [
          "hover:bg-accent hover:text-accent-foreground",
          "hover:scale-105 active:scale-95",
        ],
        success: [
          "bg-gradient-success text-success-foreground",
          "shadow-md hover:shadow-lg hover:shadow-success/25",
          "hover:scale-105 active:scale-95",
        ],
        warning: [
          "bg-gradient-warning text-warning-foreground",
          "shadow-md hover:shadow-lg hover:shadow-warning/25",
          "hover:scale-105 active:scale-95",
        ],
        info: [
          "bg-gradient-info text-info-foreground",
          "shadow-md hover:shadow-lg hover:shadow-info/25",
          "hover:scale-105 active:scale-95",
        ],
        error: [
          "bg-gradient-error text-error-foreground",
          "shadow-md hover:shadow-lg hover:shadow-error/25",
          "hover:scale-105 active:scale-95",
        ],
        telegram: [
          "bg-gradient-telegram text-telegram-foreground",
          "shadow-md hover:shadow-lg hover:shadow-telegram/25",
          "hover:scale-105 active:scale-95",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500",
        ],
        floating: [
          "bg-background/80 backdrop-blur-md border border-border/50 text-foreground",
          "shadow-lg hover:shadow-xl",
          "hover:bg-background/90 hover:border-primary/30",
          "hover:scale-110 active:scale-95",
        ],
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-10 w-10",
        touch: "h-12 px-6 text-base min-w-[120px]", // Mobile optimized
      },
      feedback: {
        none: "",
        subtle: "hover:brightness-110",
        medium: "hover:brightness-115 hover:saturate-110",
        strong: "hover:brightness-125 hover:saturate-125",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      feedback: "medium",
    },
  },
);

export interface EnhancedInteractionButtonProps
  extends
    MotionButtonProps,
    VariantProps<typeof enhancedInteractionButtonVariants> {
  loading?: boolean;
  loadingText?: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  ripple?: boolean;
  haptic?: boolean;
}

export const EnhancedInteractionButton = React.forwardRef<
  HTMLButtonElement,
  EnhancedInteractionButtonProps
>(({
  className,
  variant,
  size,
  feedback,
  loading = false,
  loadingText = "Loading...",
  icon,
  iconPosition = "left",
  ripple = true,
  haptic = false,
  children,
  disabled,
  onClick,
  ...props
}, ref) => {
  const [isPressed, setIsPressed] = React.useState(false);
  const [ripples, setRipples] = React.useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(ref, () => buttonRef.current!);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    // Haptic feedback for mobile
    if (haptic && "vibrate" in navigator) {
      navigator.vibrate(10);
    }

    // Ripple effect
    if (ripple && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();

      setRipples((prev) => [...prev, { id, x, y }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }

    onClick?.(e);
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  return (
    <motion.button
      ref={buttonRef}
      className={cn(
        enhancedInteractionButtonVariants({ variant, size, feedback }),
        className,
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {/* Loading spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button content */}
      <motion.div
        className={cn(
          "flex items-center gap-2 relative z-10",
          loading && "opacity-0",
        )}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {icon && iconPosition === "left" && (
          <motion.div
            animate={{ rotate: isPressed ? 5 : 0 }}
            transition={{ duration: 0.1 }}
          >
            {icon}
          </motion.div>
        )}

        <span>
          {loading ? loadingText : (children as React.ReactNode)}
        </span>

        {icon && iconPosition === "right" && (
          <motion.div
            animate={{ rotate: isPressed ? -5 : 0 }}
            transition={{ duration: 0.1 }}
          >
            {icon}
          </motion.div>
        )}
      </motion.div>

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(({ id, x, y }) => (
          <motion.div
            key={id}
            className="absolute pointer-events-none rounded-full bg-white/30"
            style={{
              left: x - 10,
              top: y - 10,
              width: 20,
              height: 20,
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Pressure indicator */}
      <motion.div
        className="absolute inset-0 bg-white/5 pointer-events-none"
        animate={{ opacity: isPressed ? 1 : 0 }}
        transition={{ duration: 0.1 }}
      />
    </motion.button>
  );
});

EnhancedInteractionButton.displayName = "EnhancedInteractionButton";
