"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Column, Flex, Row } from "@/components/dynamic-ui-system";

import {
  type DynamicMotionVariantKey,
  dynamicMotionVariants,
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
  variant?: DynamicMotionVariantKey | null;
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
  const resolvedVariants = variants ??
    (shouldUsePreset && variant ? dynamicMotionVariants[variant] : undefined);

  const shouldAutoInView = shouldUsePreset && animate === undefined;

  return {
    variants: resolvedVariants,
    initial: shouldAutoInView && resolvedVariants
      ? initial ?? "hidden"
      : initial,
    whileInView: shouldAutoInView && resolvedVariants
      ? whileInView ?? "visible"
      : whileInView,
    viewport: shouldAutoInView && resolvedVariants
      ? viewport ?? { once, amount: viewportAmount }
      : viewport,
  } as const;
}

export interface DynamicMotionFlexProps extends MotionBaseProps {
  variant?: DynamicMotionVariantKey | null;
  animateIn?: boolean;
  once?: boolean;
  viewportAmount?: number;
}

export const DynamicMotionFlex = React.forwardRef<
  HTMLDivElement,
  DynamicMotionFlexProps
>(
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
    const { variants, initial, whileInView, viewport: resolvedViewport } = React
      .useMemo(
        () =>
          resolveMotionPreset({
            animateIn,
            variant,
            once,
            viewportAmount,
            animate: animateProp,
            variants: variantsProp,
            viewport,
            initial: initialProp,
            whileInView: whileInViewProp,
          }),
        [
          animateIn,
          animateProp,
          initialProp,
          once,
          variant,
          variantsProp,
          viewport,
          viewportAmount,
          whileInViewProp,
        ],
      );

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
DynamicMotionFlex.displayName = "DynamicMotionFlex";

export interface DynamicMotionColumnProps
  extends React.ComponentPropsWithoutRef<typeof MotionColumnBase> {
  variant?: DynamicMotionVariantKey | null;
  animateIn?: boolean;
  once?: boolean;
  viewportAmount?: number;
}

export const DynamicMotionColumn = React.forwardRef<
  HTMLDivElement,
  DynamicMotionColumnProps
>(
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
    const { variants, initial, whileInView, viewport: resolvedViewport } = React
      .useMemo(
        () =>
          resolveMotionPreset({
            animateIn,
            variant,
            once,
            viewportAmount,
            animate: animateProp,
            variants: variantsProp,
            viewport,
            initial: initialProp,
            whileInView: whileInViewProp,
          }),
        [
          animateIn,
          animateProp,
          initialProp,
          once,
          variant,
          variantsProp,
          viewport,
          viewportAmount,
          whileInViewProp,
        ],
      );

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
DynamicMotionColumn.displayName = "DynamicMotionColumn";

export interface DynamicMotionRowProps
  extends React.ComponentPropsWithoutRef<typeof MotionRowBase> {
  variant?: DynamicMotionVariantKey | null;
  animateIn?: boolean;
  once?: boolean;
  viewportAmount?: number;
}

export const DynamicMotionRow = React.forwardRef<
  HTMLDivElement,
  DynamicMotionRowProps
>(
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
    const { variants, initial, whileInView, viewport: resolvedViewport } = React
      .useMemo(
        () =>
          resolveMotionPreset({
            animateIn,
            variant,
            once,
            viewportAmount,
            animate: animateProp,
            variants: variantsProp,
            viewport,
            initial: initialProp,
            whileInView: whileInViewProp,
          }),
        [
          animateIn,
          animateProp,
          initialProp,
          once,
          variant,
          variantsProp,
          viewport,
          viewportAmount,
          whileInViewProp,
        ],
      );

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
DynamicMotionRow.displayName = "DynamicMotionRow";

type DynamicMotionStackDensity = "base" | "soft" | "slow";

const densityToVariant: Record<
  DynamicMotionStackDensity,
  DynamicMotionVariantKey
> = {
  base: "stackItem",
  soft: "stackItemSoft",
  slow: "stackItemSlow",
};

export type DynamicMotionStackProps = DynamicMotionColumnProps;

export const DynamicMotionStack = React.forwardRef<
  HTMLDivElement,
  DynamicMotionStackProps
>(
  ({ variant, ...rest }, ref) => (
    <DynamicMotionColumn ref={ref} variant={variant ?? "stack"} {...rest} />
  ),
);
DynamicMotionStack.displayName = "DynamicMotionStack";

export interface DynamicMotionStackItemProps extends DynamicMotionColumnProps {
  density?: DynamicMotionStackDensity;
}

export const DynamicMotionStackItem = React.forwardRef<
  HTMLDivElement,
  DynamicMotionStackItemProps
>(({ density = "base", variant, ...rest }, ref) => {
  const resolvedVariant = variant ?? densityToVariant[density];
  return <DynamicMotionColumn ref={ref} variant={resolvedVariant} {...rest} />;
});
DynamicMotionStackItem.displayName = "DynamicMotionStackItem";

export type { DynamicMotionStackDensity };
