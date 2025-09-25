import React from "react";
import { cn } from "@/utils";

interface GlassElementProps {
  children: React.ReactNode;
  className?: string;
  variant?: "light" | "dark" | "primary" | "accent";
  blur?: "sm" | "md" | "lg" | "xl";
  opacity?: "low" | "medium" | "high";
}

const blurVariants = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
};

const opacityVariants = {
  low: "bg-background/5 dark:bg-foreground/5",
  medium: "bg-background/10 dark:bg-foreground/10",
  high: "bg-background/20 dark:bg-foreground/20",
};

const borderVariants = {
  light: "border-border/20",
  dark: "border-foreground/20",
  primary: "border-primary/20",
  accent: "border-accent/20",
};

export function GlassCard({
  children,
  className,
  variant = "light",
  blur = "md",
  opacity = "medium",
}: GlassElementProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300",
        blurVariants[blur],
        opacityVariants[opacity],
        borderVariants[variant],
        "shadow-lg hover:shadow-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassButton({
  children,
  className,
  variant = "light",
  blur = "md",
  opacity = "medium",
  ...props
}: GlassElementProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg border transition-all duration-300",
        "hover:scale-105 active:scale-95",
        "focus:ring-2 focus:ring-primary/50",
        blurVariants[blur],
        opacityVariants[opacity],
        borderVariants[variant],
        "shadow-sm hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function GlassNav({
  children,
  className,
  variant = "light",
  blur = "xl",
  opacity = "medium",
}: GlassElementProps) {
  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        blurVariants[blur],
        opacityVariants[opacity],
        borderVariants[variant],
        className,
      )}
    >
      {children}
    </nav>
  );
}
