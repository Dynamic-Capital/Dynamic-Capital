"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils";

type MotionDivProps = React.ComponentPropsWithoutRef<typeof motion.div>;

const smartCardVariants = cva(
  "relative rounded-lg border bg-card text-card-foreground transition-all duration-300 overflow-hidden group",
  {
    variants: {
      variant: {
        default: [
          "shadow-sm hover:shadow-md",
          "hover:scale-[1.02] active:scale-[0.98]",
          "border-border/50 hover:border-primary/30",
        ],
        elevated: [
          "shadow-md hover:shadow-lg",
          "hover:scale-[1.03] active:scale-[0.97]",
          "border-border/30 hover:border-primary/40",
        ],
        glass: [
          "bg-background/40 backdrop-blur-md",
          "shadow-lg hover:shadow-xl",
          "border-border/20 hover:border-primary/50",
          "hover:bg-background/60",
        ],
        interactive: [
          "cursor-pointer shadow-sm hover:shadow-lg",
          "hover:scale-[1.03] active:scale-[0.97]",
          "border-border/50 hover:border-primary/40",
          "transition-all duration-200",
        ],
        trading: [
          "bg-gradient-to-br from-card via-card/90 to-primary/5",
          "shadow-md hover:shadow-lg hover:shadow-primary/10",
          "border-border/30 hover:border-primary/50",
          "hover:scale-[1.02]",
        ],
        status: [
          "border-2 transition-all duration-300",
          "hover:scale-[1.02] active:scale-[0.98]",
        ],
      },
      size: {
        sm: "p-3",
        default: "p-4",
        lg: "p-6",
        xl: "p-8",
      },
      spacing: {
        compact: "space-y-2",
        default: "space-y-3",
        relaxed: "space-y-4",
        loose: "space-y-6",
      },
      status: {
        none: "",
        success:
          "border-success/50 bg-success/5 hover:border-success hover:bg-success/10",
        warning:
          "border-warning/50 bg-warning/5 hover:border-warning hover:bg-warning/10",
        error:
          "border-error/50 bg-error/5 hover:border-error hover:bg-error/10",
        info: "border-info/50 bg-info/5 hover:border-info hover:bg-info/10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      spacing: "default",
      status: "none",
    },
  },
);

export interface SmartCardProps
  extends MotionDivProps, VariantProps<typeof smartCardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  interactive?: boolean;
  hoverEffect?: "lift" | "glow" | "scale" | "none";
  contentPadding?: boolean;
}

export const SmartCard = React.forwardRef<HTMLDivElement, SmartCardProps>(
  ({
    className,
    variant,
    size,
    spacing,
    status,
    header,
    footer,
    loading = false,
    interactive = false,
    hoverEffect = "scale",
    contentPadding = true,
    children,
    onClick,
    ...props
  }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const hoverEffects = {
      lift: "hover:-translate-y-2",
      glow: "hover:shadow-primary/20",
      scale: "hover:scale-[1.02]",
      none: "",
    };

    const motionProps = interactive
      ? {
        whileHover: { y: -2, scale: 1.01 },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.2 },
      }
      : {};

    return (
      <motion.div
        ref={ref}
        className={cn(
          smartCardVariants({ variant, size, spacing, status }),
          hoverEffects[hoverEffect],
          interactive && "cursor-pointer",
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        {...motionProps}
        {...props}
      >
        {/* Loading overlay */}
        {loading && (
          <motion.div
            className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Loading...</span>
            </div>
          </motion.div>
        )}

        {/* Hover indicator line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-dc-brand to-accent"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Header */}
        {header && (
          <motion.div
            className="border-b border-border/50 pb-3 mb-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {header}
          </motion.div>
        )}

        {/* Content */}
        <motion.div
          className={cn(
            "relative",
            contentPadding && "space-y-3",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.div>

        {/* Footer */}
        {footer && (
          <motion.div
            className="border-t border-border/50 pt-3 mt-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {footer}
          </motion.div>
        )}

        {/* Background pattern for trading cards */}
        {variant === "trading" && (
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="pattern-grid text-primary/20 h-full w-full" />
          </div>
        )}
      </motion.div>
    );
  },
);

SmartCard.displayName = "SmartCard";

// Card components for specific use cases
export const TradingCard = React.forwardRef<HTMLDivElement, SmartCardProps>(
  (props, ref) => <SmartCard ref={ref} variant="trading" {...props} />,
);

export const StatusCard = React.forwardRef<
  HTMLDivElement,
  SmartCardProps & { statusType: "success" | "warning" | "error" | "info" }
>(({ statusType, ...props }, ref) => (
  <SmartCard ref={ref} variant="status" status={statusType} {...props} />
));

export const InteractiveCard = React.forwardRef<HTMLDivElement, SmartCardProps>(
  (props, ref) => (
    <SmartCard
      ref={ref}
      variant="interactive"
      interactive
      hoverEffect="lift"
      {...props}
    />
  ),
);

TradingCard.displayName = "TradingCard";
StatusCard.displayName = "StatusCard";
InteractiveCard.displayName = "InteractiveCard";
