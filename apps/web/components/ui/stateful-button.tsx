"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/utils";
import { EnhancedButton, EnhancedButtonProps } from "./enhanced-button";

export type ButtonState = "idle" | "loading" | "success" | "error";

interface StatefulButtonProps extends Omit<EnhancedButtonProps, "loading"> {
  state?: ButtonState;
  onStateChange?: (state: ButtonState) => void;
  successText?: string;
  errorText?: string;
  loadingText?: string;
  resetDelay?: number;
  children: React.ReactNode;
}

export function StatefulButton({
  state = "idle",
  onStateChange,
  successText = "Success!",
  errorText = "Error",
  loadingText = "Loading...",
  resetDelay = 2000,
  children,
  className,
  onClick,
  disabled,
  ...props
}: StatefulButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>("idle");

  const currentState = state !== "idle" ? state : internalState;

  React.useEffect(() => {
    if (currentState === "success" || currentState === "error") {
      const timer = setTimeout(() => {
        setInternalState("idle");
        onStateChange?.("idle");
      }, resetDelay);
      return () => clearTimeout(timer);
    }
  }, [currentState, resetDelay, onStateChange]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (currentState !== "idle") return;

    setInternalState("loading");
    onStateChange?.("loading");

    try {
      await onClick?.(e);
      setInternalState("success");
      onStateChange?.("success");
    } catch (error) {
      setInternalState("error");
      onStateChange?.("error");
    }
  };

  const getContent = () => {
    switch (currentState) {
      case "loading":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </motion.div>
        );
      case "success":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="flex items-center gap-2 text-success"
          >
            <Check className="h-4 w-4" />
            {successText}
          </motion.div>
        );
      case "error":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="flex items-center gap-2 text-dc-brand-dark dark:text-dc-brand-light"
          >
            <X className="h-4 w-4" />
            {errorText}
          </motion.div>
        );
      default:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {children}
          </motion.div>
        );
    }
  };

  const getVariant = () => {
    switch (currentState) {
      case "success":
        return "default";
      case "error":
        return "destructive";
      default:
        return props.variant || "default";
    }
  };

  return (
    <EnhancedButton
      {...props}
      variant={getVariant()}
      className={cn(
        "min-w-[120px] transition-all duration-300",
        currentState === "loading" && "cursor-wait",
        currentState === "success" &&
          "bg-success hover:bg-success/90 border-success",
        currentState === "error" &&
          "bg-dc-brand-dark hover:bg-dc-brand-dark border-dc-brand-dark",
        className,
      )}
      disabled={disabled || currentState !== "idle"}
      onClick={handleClick}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentState}
          className="flex items-center justify-center"
        >
          {getContent()}
        </motion.div>
      </AnimatePresence>
    </EnhancedButton>
  );
}
