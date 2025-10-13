"use client";

import * as React from "react";

import {
  Card as DynamicCard,
  Column,
  Row,
  Text,
} from "@/components/dynamic-ui-system";
import { cn } from "@/utils";

type DynamicCardProps = React.ComponentPropsWithoutRef<typeof DynamicCard>;
type ColumnProps = React.ComponentPropsWithoutRef<typeof Column>;
type RowProps = React.ComponentPropsWithoutRef<typeof Row>;
type TextProps = React.ComponentPropsWithoutRef<typeof Text>;
type TextElement = React.ElementRef<typeof Text>;

const Card = React.forwardRef<HTMLDivElement, DynamicCardProps>(
  ({ className, padding, radius = "xl", gap, ...props }, ref) => (
    <DynamicCard
      ref={ref}
      padding={padding ?? "0"}
      radius={radius}
      gap={gap ?? "0"}
      className={cn(
        "relative overflow-hidden border border-border/50 bg-background/80 shadow-lg shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/65",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, ColumnProps>(
  ({ className, gap, padding, paddingX, paddingY, ...props }, ref) => (
    <Column
      ref={ref}
      gap={gap ?? "8"}
      padding={padding}
      paddingX={paddingX ?? (padding ? undefined : "24")}
      paddingY={paddingY ?? (padding ? undefined : "24")}
      className={cn("space-y-1.5", className)}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<TextElement, TextProps>(
  ({ className, variant, as = "h3", weight, size, ...props }, ref) => {
    const textProps: TextProps = {
      ref,
      as,
      className: cn("tracking-tight", className),
      ...props,
    } as TextProps;

    if (variant !== undefined) {
      textProps.variant = variant;
    } else if (weight !== undefined || size !== undefined) {
      if (weight !== undefined) {
        textProps.weight = weight;
      }
      textProps.size = size ?? "m";
    } else {
      textProps.variant = "heading-strong-m";
    }

    return <Text {...textProps} />;
  },
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<TextElement, TextProps>(
  ({ className, variant, onBackground, as = "p", ...props }, ref) => (
    <Text
      ref={ref}
      as={as}
      variant={variant ?? "body-default-s"}
      onBackground={onBackground ?? "neutral-weak"}
      className={cn("leading-relaxed", className)}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, ColumnProps>(
  ({ className, gap, padding, paddingX, paddingY, ...props }, ref) => (
    <Column
      ref={ref}
      gap={gap ?? "12"}
      padding={padding}
      paddingX={paddingX ?? (padding ? undefined : "24")}
      paddingY={paddingY ?? (padding ? undefined : "16")}
      className={cn(className)}
      {...props}
    />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, RowProps>(
  (
    { className, gap, padding, paddingX, paddingY, vertical, ...props },
    ref,
  ) => (
    <Row
      ref={ref}
      gap={gap ?? "12"}
      padding={padding}
      paddingX={paddingX ?? (padding ? undefined : "24")}
      paddingY={paddingY ?? (padding ? undefined : "16")}
      vertical={vertical ?? "center"}
      className={cn(className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
