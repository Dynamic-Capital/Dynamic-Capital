"use client";

import { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/utils";

const dynamicBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      tone: {
        neutral: "border-border/40 bg-muted/30 text-muted-foreground",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        info: "border-info/30 bg-info/10 text-info",
        brand: "border-dc-brand/30 bg-dc-brand/10 text-dc-brand-dark",
      },
      emphasis: {
        soft: "",
        solid: "",
        outline: "bg-transparent",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[11px]",
        xs: "px-1.5 py-0.5 text-[10px]",
      },
    },
    compoundVariants: [
      {
        tone: "neutral",
        emphasis: "solid",
        className: "border-border bg-muted text-foreground",
      },
      {
        tone: "neutral",
        emphasis: "outline",
        className: "border-border/60 text-muted-foreground",
      },
      {
        tone: "success",
        emphasis: "solid",
        className: "border-success bg-success text-success-foreground",
      },
      {
        tone: "success",
        emphasis: "outline",
        className: "border-success/60 text-success",
      },
      {
        tone: "warning",
        emphasis: "solid",
        className: "border-warning bg-warning text-warning-foreground",
      },
      {
        tone: "warning",
        emphasis: "outline",
        className: "border-warning/60 text-warning",
      },
      {
        tone: "info",
        emphasis: "solid",
        className: "border-info bg-info text-info-foreground",
      },
      {
        tone: "info",
        emphasis: "outline",
        className: "border-info/60 text-info",
      },
      {
        tone: "brand",
        emphasis: "solid",
        className: "border-dc-brand bg-dc-brand text-white",
      },
      {
        tone: "brand",
        emphasis: "outline",
        className: "border-dc-brand/60 text-dc-brand-dark",
      },
    ],
    defaultVariants: {
      tone: "neutral",
      emphasis: "soft",
      size: "default",
    },
  },
);

export type DynamicBadgeTone = NonNullable<
  VariantProps<typeof dynamicBadgeVariants>["tone"]
>;
export type DynamicBadgeEmphasis = NonNullable<
  VariantProps<typeof dynamicBadgeVariants>["emphasis"]
>;
export type DynamicBadgeSize = NonNullable<
  VariantProps<typeof dynamicBadgeVariants>["size"]
>;

export interface DynamicBadgeProps
  extends
    Omit<BadgeProps, "variant">,
    VariantProps<typeof dynamicBadgeVariants> {
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  pulse?: boolean;
}

export function DynamicBadge({
  tone,
  emphasis,
  size,
  icon,
  iconPosition = "start",
  pulse = false,
  className,
  children,
  ...props
}: DynamicBadgeProps) {
  const variant = emphasis === "outline" ? "outline" : "default";

  const iconElement = icon
    ? (
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
        {icon}
      </span>
    )
    : null;

  return (
    <Badge
      {...props}
      variant={variant}
      className={cn(
        dynamicBadgeVariants({ tone, emphasis, size }),
        pulse && "animate-[pulse_2s_ease-in-out_infinite]",
        className,
      )}
    >
      {iconElement && iconPosition === "start" ? iconElement : null}
      {children}
      {iconElement && iconPosition === "end" ? iconElement : null}
    </Badge>
  );
}
