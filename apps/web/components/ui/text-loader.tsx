import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";

interface TextLoaderProps {
  className?: string;
  dotColorClass?: string;
  size?: "sm" | "md" | "lg";
  showBar?: boolean;
  barWidthClass?: string;
}

export function TextLoader({
  className,
  dotColorClass = "text-primary",
  size = "md",
  showBar = false,
  barWidthClass = "w-40",
}: TextLoaderProps) {
  const dotSize = size === "sm"
    ? "w-1.5 h-1.5"
    : size === "lg"
    ? "w-3 h-3"
    : "w-2 h-2";
  const gap = size === "sm" ? "gap-1.5" : size === "lg" ? "gap-2.5" : "gap-2";

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <div className={cn("flex items-end", gap)}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={cn("rounded-full bg-current", dotSize, dotColorClass)}
            initial={{ y: 0, opacity: 0.4 }}
            animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      {showBar && (
        <div className="relative overflow-hidden mt-2 rounded-full bg-muted h-2 w-full">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-muted-foreground/20",
              barWidthClass,
            )}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </div>
  );
}
