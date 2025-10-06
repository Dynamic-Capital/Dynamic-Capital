"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/utils";
import { useTheme } from "@/hooks/useTheme";
import { useAnalytics } from "@/hooks/useAnalytics";

export function ThemeToggle() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const { trackEvent } = useAnalytics();

  const handleToggle = React.useCallback(() => {
    const nextPreference = theme === "light"
      ? "dark"
      : theme === "dark"
      ? "system"
      : "light";

    toggleTheme();

    const timestamp = new Date().toISOString();

    setTimeout(() => {
      const resolvedTheme = typeof document !== "undefined"
        ? document.documentElement.getAttribute("data-theme") ?? undefined
        : undefined;

      trackEvent({
        event_type: "theme_toggle",
        interaction_data: {
          previous_preference: theme,
          next_preference: nextPreference,
          previous_resolved_theme: currentTheme,
          resolved_theme_after_toggle: resolvedTheme,
          timestamp,
        },
      });
    }, 0);
  }, [theme, currentTheme, toggleTheme, trackEvent]);

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        onClick={handleToggle}
        variant="outline"
        size="lg"
        className={cn(
          "relative h-14 w-14 rounded-full p-0 overflow-hidden",
          "bg-background/80 backdrop-blur-md border-2",
          "hover:scale-110 active:scale-95 transition-all duration-200",
          "shadow-lg hover:shadow-xl",
          "border-primary/30 hover:border-primary/50",
          "hover:bg-gradient-primary hover:text-primary-foreground",
        )}
      >
        <AnimatePresence mode="wait">
          {currentTheme === "light"
            ? (
              <motion.div
                key="sun"
                initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 180, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Sun className="h-6 w-6 text-primary" />
              </motion.div>
            )
            : (
              <motion.div
                key="moon"
                initial={{ opacity: 0, rotate: 180, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -180, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Moon className="h-6 w-6 text-primary" />
              </motion.div>
            )}
        </AnimatePresence>

        {/* Background gradient effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-primary opacity-0 transition-opacity duration-300 rounded-full"
          whileHover={{ opacity: 0.1 }}
        />
      </Button>
    </motion.div>
  );
}
