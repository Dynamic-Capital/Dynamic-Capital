"use client";

import * as React from "react";

import { Tag } from "@/components/dynamic-ui-system";
import type { TagProps } from "@/components/dynamic-ui-system/internal/components/Tag";
import { cn } from "@/utils";

type DynamicTagProps = React.ComponentPropsWithoutRef<typeof Tag>;

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

const BADGE_STYLES: Record<BadgeVariant, {
  background: TagProps["background"];
  border?: TagProps["border"];
  className?: string;
}> = {
  default: {
    background: "brand-alpha-weak",
    border: "brand-alpha-medium",
    className: "text-brand-strong",
  },
  secondary: {
    background: "neutral-alpha-weak",
    border: "neutral-alpha-medium",
    className: "text-foreground/80",
  },
  destructive: {
    background: "danger-alpha-weak",
    border: "danger-alpha-medium",
    className: "text-danger-strong",
  },
  outline: {
    background: "transparent",
    border: "neutral-alpha-medium",
    className: "text-foreground",
  },
  success: {
    background: "success-alpha-weak",
    border: "success-alpha-medium",
    className: "text-success-strong",
  },
  warning: {
    background: "warning-alpha-weak",
    border: "warning-alpha-medium",
    className: "text-warning-strong",
  },
};

export interface BadgeProps
  extends Omit<DynamicTagProps, "variant" | "size" | "background" | "border"> {
  variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    { variant = "default", className, children, padding, radius, ...props },
    ref,
  ) => {
    const style = BADGE_STYLES[variant] ?? BADGE_STYLES.default;

    return (
      <Tag
        ref={ref}
        size="s"
        radius={radius ?? "full"}
        background={style.background}
        border={style.border}
        padding={padding ?? "8"}
        className={cn(
          "inline-flex items-center gap-2 font-semibold uppercase tracking-[0.24em] text-[10px]",
          style.className,
          className,
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  },
);

Badge.displayName = "Badge";

export { Badge };
