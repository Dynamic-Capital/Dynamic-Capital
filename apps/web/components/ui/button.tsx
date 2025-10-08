"use client";

import * as React from "react";

import { Button as DynamicButton } from "@/components/dynamic-ui-system";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { cn } from "@/utils";

type DynamicButtonProps = ComponentPropsWithoutRef<typeof DynamicButton>;
type DynamicVariant = NonNullable<DynamicButtonProps["variant"]>;
type DynamicSize = NonNullable<DynamicButtonProps["size"]>;

type LegacyVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "link"
  | "destructive"
  | "brand"
  | "premium"
  | "telegram"
  | "telegram-outline"
  | "glass"
  | "subtle"
  | "success"
  | "warning"
  | "info";

type LegacySize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "xl"
  | "icon"
  | "icon-sm"
  | "icon-lg";

interface VariantMapping {
  variant: DynamicVariant;
  className?: string;
}

interface SizeMapping {
  size: DynamicSize;
  className?: string;
}

const VARIANT_MAP: Record<LegacyVariant, VariantMapping> = {
  default: { variant: "primary" },
  secondary: { variant: "secondary" },
  outline: {
    variant: "tertiary",
    className: "border border-border/60 bg-transparent",
  },
  ghost: { variant: "tertiary", className: "bg-transparent" },
  link: {
    variant: "tertiary",
    className: "bg-transparent underline underline-offset-4 text-primary",
  },
  destructive: { variant: "danger" },
  brand: { variant: "primary" },
  premium: {
    variant: "primary",
    className:
      "bg-gradient-to-r from-primary via-primary/90 to-accent text-white shadow-lg shadow-primary/20",
  },
  telegram: {
    variant: "primary",
    className:
      "bg-[linear-gradient(135deg,#2AABEE,#1B91D9)] text-white shadow-lg shadow-cyan-500/30",
  },
  "telegram-outline": {
    variant: "tertiary",
    className: "border-2 border-[#2AABEE] text-[#2AABEE] hover:bg-[#2AABEE]/10",
  },
  glass: {
    variant: "secondary",
    className:
      "border border-white/20 bg-white/10 text-foreground backdrop-blur",
  },
  subtle: {
    variant: "tertiary",
    className: "bg-muted/60 text-muted-foreground",
  },
  success: {
    variant: "secondary",
    className: "bg-success-alpha-weak text-success-strong",
  },
  warning: {
    variant: "secondary",
    className: "bg-warning-alpha-weak text-warning-strong",
  },
  info: {
    variant: "secondary",
    className: "bg-info-alpha-weak text-info-strong",
  },
};

const SIZE_MAP: Record<LegacySize, SizeMapping> = {
  default: { size: "m" },
  xs: { size: "s", className: "h-8 px-2 text-xs" },
  sm: { size: "s" },
  lg: { size: "l" },
  xl: { size: "l", className: "h-12 px-6 text-base" },
  icon: { size: "s", className: "h-10 w-10 p-0" },
  "icon-sm": { size: "s", className: "h-8 w-8 p-0" },
  "icon-lg": { size: "l", className: "h-12 w-12 p-0" },
};

export interface ButtonProps extends
  Omit<
    DynamicButtonProps,
    | "variant"
    | "size"
    | "fillWidth"
    | "loading"
    | "href"
    | "target"
    | "rel"
    | "type"
  > {
  variant?: LegacyVariant;
  size?: LegacySize;
  fullWidth?: boolean;
  responsive?: boolean;
  isLoading?: boolean;
  asChild?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

const RESPONSIVE_CLASS =
  "min-h-[44px] sm:min-h-[40px] touch-manipulation active:scale-95 transition-transform duration-150";

type ButtonElement = ElementRef<typeof DynamicButton>;

const Button = React.forwardRef<ButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      fullWidth = false,
      responsive = false,
      isLoading = false,
      asChild,
      className,
      children,
      href,
      target,
      rel,
      type,
      ...rest
    },
    ref,
  ) => {
    if (process.env.NODE_ENV !== "production" && asChild) {
      console.warn(
        "[Button]: `asChild` is deprecated. Pass an `href` prop for link behaviour.",
      );
    }

    const variantEntry = VARIANT_MAP[variant] ?? VARIANT_MAP.default;
    const sizeEntry = SIZE_MAP[size] ?? SIZE_MAP.default;

    const dynamicProps: DynamicButtonProps & {
      href?: string;
      target?: string;
      rel?: string;
    } = {
      ...(rest as DynamicButtonProps),
      variant: variantEntry.variant,
      size: sizeEntry.size,
      fillWidth: fullWidth,
      loading: isLoading,
      className: cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold uppercase tracking-[0.24em] transition-all duration-200",
        variantEntry.className,
        sizeEntry.className,
        responsive ? RESPONSIVE_CLASS : null,
        fullWidth ? "w-full" : null,
        className,
      ),
    };

    if (href) {
      dynamicProps.href = href;
      if (target) {
        dynamicProps.target = target;
      }
      if (rel) {
        dynamicProps.rel = rel;
      }
    } else {
      dynamicProps.type = type ?? "button";
    }

    return (
      <DynamicButton ref={ref} {...dynamicProps}>
        {children}
      </DynamicButton>
    );
  },
);

Button.displayName = "Button";

export { Button };
