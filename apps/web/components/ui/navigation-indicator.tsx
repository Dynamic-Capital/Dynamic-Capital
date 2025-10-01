import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/utils";

interface NavigationIndicatorProps {
  isActive?: boolean;
  variant?: "dot" | "line" | "glow";
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export const NavigationIndicator: React.FC<NavigationIndicatorProps> = ({
  isActive = false,
  variant = "line",
  position = "bottom",
  className,
}) => {
  const baseClasses = cn(
    "absolute transition-all duration-300",
    {
      "bottom-0 left-1/2 transform -translate-x-1/2": position === "bottom",
      "top-0 left-1/2 transform -translate-x-1/2": position === "top",
      "left-0 top-1/2 transform -translate-y-1/2": position === "left",
      "right-0 top-1/2 transform -translate-y-1/2": position === "right",
    },
    className,
  );

  if (variant === "dot") {
    return (
      <AnimatePresence>
        {isActive && (
          <motion.div
            className={cn(
              baseClasses,
              "w-1.5 h-1.5 rounded-full bg-primary",
            )}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 0.2,
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        )}
      </AnimatePresence>
    );
  }

  if (variant === "glow") {
    return (
      <AnimatePresence>
        {isActive && (
          <motion.div
            className={cn(
              baseClasses,
              "w-8 h-0.5 bg-gradient-brand rounded-full shadow-lg shadow-primary/50",
            )}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{
              opacity: 1,
              scaleX: 1,
              boxShadow: [
                "0 0 10px hsl(var(--primary) / 0.5)",
                "0 0 20px hsl(var(--primary) / 0.8)",
                "0 0 10px hsl(var(--primary) / 0.5)",
              ],
            }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{
              duration: 0.3,
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        )}
      </AnimatePresence>
    );
  }

  // Default line variant
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={cn(
            baseClasses,
            "h-0.5 w-full bg-gradient-brand rounded-full",
          )}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}
    </AnimatePresence>
  );
};

export default NavigationIndicator;
