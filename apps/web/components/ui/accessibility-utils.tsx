import React from "react";
import { cn } from "@/utils";

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "bg-primary text-primary-foreground px-4 py-2 ui-rounded-lg",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        className,
      )}
    >
      {children}
    </a>
  );
}

interface VisuallyHiddenProps {
  children: React.ReactNode;
  className?: string;
}

export function VisuallyHidden({ children, className }: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "sr-only",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  className?: string;
}

export function AccessibleIcon(
  { icon, label, className }: AccessibleIconProps,
) {
  return (
    <span className={className} aria-label={label} role="img">
      {icon}
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}

interface HighContrastTextProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "muted";
  className?: string;
}

export function HighContrastText({
  children,
  variant = "primary",
  className,
}: HighContrastTextProps) {
  const variantClasses = {
    primary:
      "text-foreground contrast-more:text-black dark:contrast-more:text-white",
    secondary:
      "text-muted-foreground contrast-more:text-gray-800 dark:contrast-more:text-gray-200",
    muted:
      "text-muted-foreground/80 contrast-more:text-gray-700 dark:contrast-more:text-gray-300",
  };

  return (
    <span className={cn(variantClasses[variant], className)}>
      {children}
    </span>
  );
}
