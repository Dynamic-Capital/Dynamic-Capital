"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Column, Flex, Row } from "@once-ui-system/core";

import {
  onceMotionVariants,
  type OnceMotionVariantKey,
} from "@/lib/motion-variants";

const MotionFlexBase = motion(Flex, { forwardMotionProps: true });
const MotionColumnBase = motion(Column, { forwardMotionProps: true });
const MotionRowBase = motion(Row, { forwardMotionProps: true });

type MotionBaseProps = React.ComponentPropsWithoutRef<typeof MotionFlexBase>;

type MotionPresetShape = Pick<
  MotionBaseProps,
  "animate" | "variants" | "viewport" | "initial" | "whileInView"
>;

interface MotionPresetInput extends MotionPresetShape {
  animateIn: boolean;
  variant?: OnceMotionVariantKey | null;
  once: boolean;
  viewportAmount: number;
}

function resolveMotionPreset({
  animateIn,
  variant,
  once,
  viewportAmount,
  animate,
  variants,
  viewport,
  initial,
  whileInView,
}: MotionPresetInput) {
  const shouldUsePreset = animateIn && variant !== null;
  const resolvedVariants =
    variants ?? (shouldUsePreset && variant ? onceMotionVariants[variant] : undefined);

  const shouldAutoInView = shouldUsePreset && animate === undefined;

  return {
    variants: resolvedVariants,
    initial: shouldAutoInView && resolvedVariants ? initial ?? "hidden" : initial,
    whileInView:
      shouldAutoInView && resolvedVariants ? whileInView ?? "visible" : whileInView,
    viewport:
      shouldAutoInView && resolvedVariants
        ? viewport ?? { once, amount: viewportAmount }
        : viewport,
  } as const;
}

export interface OnceMotionFlexProps extends MotionBaseProps {
  variant?: OnceMotionVariantKey | null;
  animateIn?: boolean;
  once?: boolean;
  viewportAmount?: number;
}

export const OnceMotionFlex = React.forwardRef<HTMLDivElement, OnceMotionFlexProps>(
  (
    {
      variant = "slideUp",
      animateIn = true,
      once = true,
      viewport,
      viewportAmount = 0.2,
      variants: variantsProp,
      initial: initialProp,
      whileInView: whileInViewProp,
      animate: animateProp,
      ...rest
    },
    ref,
  ) => {
    const { variants, initial, whileInView, viewport: resolvedViewport } = resolveMotionPreset({
      animateIn,
      variant,
      once,
      viewportAmount,
      animate: animateProp,
      variants: variantsProp,
      viewport,
      initial: initialProp,
      whileInView: whileInViewProp,
    });

    return (
      <MotionFlexBase
        ref={ref}
        variants={variants}
        initial={initial}
        animate={animateProp}
        whileInView={whileInView}
        viewport={resolvedViewport}
        {...rest}
      />
    );
  },
);
OnceMotionFlex.displayName = "OnceMotionFlex";

export interface OnceMotionColumnProps
  extends React.ComponentPropsWithoutRef<typeof MotionColumnBase> {
  variant?: OnceMotionVariantKey | null;
  animateIn?: boolean;
  once?: boolean;
  viewportAmount?: number;
}

export const OnceMotionColumn = React.forwardRef<HTMLDivElement, OnceMotionColumnProps>(
  (
    {
      variant = "slideUp",
      animateIn = true,
      once = true,
      viewport,
      viewportAmount = 0.2,
      variants: variantsProp,
      initial: initialProp,
      whileInView: whileInViewProp,
      animate: animateProp,
      ...rest
    },
    ref,
  ) => {
    const { variants, initial, whileInView, viewport: resolvedViewport } = resolveMotionPreset({
      animateIn,
      variant,
      once,
      viewportAmount,
      animate: animateProp,
      variants: variantsProp,
      viewport,
      initial: initialProp,
      whileInView: whileInViewProp,
    });

    return (
      <MotionColumnBase
        ref={ref}
        variants={variants}
        initial={initial}
        animate={animateProp}
        whileInView={whileInView}
        viewport={resolvedViewport}
        {...rest}
      />
    );
  },
);
OnceMotionColumn.displayName = "OnceMotionColumn";

export interface OnceMotionRowProps
  extends React.ComponentPropsWithoutRef<typeof MotionRowBase> {
  variant?: OnceMotionVariantKey | null;
  animateIn?: boolean;
  once?: boolean;
  viewportAmount?: number;
}

export const OnceMotionRow = React.forwardRef<HTMLDivElement, OnceMotionRowProps>(
  (
    {
      variant = "slideUp",
      animateIn = true,
      once = true,
      viewport,
      viewportAmount = 0.2,
      variants: variantsProp,
      initial: initialProp,
      whileInView: whileInViewProp,
      animate: animateProp,
      ...rest
    },
    ref,
  ) => {
    const { variants, initial, whileInView, viewport: resolvedViewport } = resolveMotionPreset({
      animateIn,
      variant,
      once,
      viewportAmount,
      animate: animateProp,
      variants: variantsProp,
      viewport,
      initial: initialProp,
      whileInView: whileInViewProp,
    });

    return (
      <MotionRowBase
        ref={ref}
        variants={variants}
        initial={initial}
        animate={animateProp}
        whileInView={whileInView}
        viewport={resolvedViewport}
        {...rest}
      />
    );
  },
);
OnceMotionRow.displayName = "OnceMotionRow";

type OnceMotionStackDensity = "base" | "soft" | "slow";

const densityToVariant: Record<OnceMotionStackDensity, OnceMotionVariantKey> = {
  base: "stackItem",
  soft: "stackItemSoft",
  slow: "stackItemSlow",
};

export type OnceMotionStackProps = OnceMotionColumnProps;

export const OnceMotionStack = React.forwardRef<HTMLDivElement, OnceMotionStackProps>(
  ({ variant, ...rest }, ref) => (
    <OnceMotionColumn ref={ref} variant={variant ?? "stack"} {...rest} />
  ),
);
OnceMotionStack.displayName = "OnceMotionStack";

export interface OnceMotionStackItemProps extends OnceMotionColumnProps {
  density?: OnceMotionStackDensity;
}

export const OnceMotionStackItem = React.forwardRef<
  HTMLDivElement,
  OnceMotionStackItemProps
>(({ density = "base", variant, ...rest }, ref) => {
  const resolvedVariant = variant ?? densityToVariant[density];
  return <OnceMotionColumn ref={ref} variant={resolvedVariant} {...rest} />;
});
OnceMotionStackItem.displayName = "OnceMotionStackItem";

export type { OnceMotionStackDensity };
