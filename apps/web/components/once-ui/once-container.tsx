"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/utils";
import {
  type OnceMotionVariantKey,
  onceMotionVariants,
} from "@/lib/motion-variants";

type MotionDivProps = React.ComponentPropsWithoutRef<typeof motion.div>;

export interface OnceContainerProps extends MotionDivProps {
  /**
   * Default animation preset triggered when the container enters the viewport.
   */
  variant?: OnceMotionVariantKey | null;
  /**
   * Disable the reveal animation while preserving the Dynamic UI layout styles.
   */
  animateIn?: boolean;
  /**
   * Configure `IntersectionObserver` behaviour. Defaults to a one-time reveal.
   */
  once?: boolean;
  /**
   * Override the viewport visibility amount used for intersection reveals.
   */
  viewportAmount?: number;
}

const MotionDiv = motion.div;

export const OnceContainer = React.forwardRef<
  HTMLDivElement,
  OnceContainerProps
>(
  (
    {
      variant = "slideUp",
      animateIn = true,
      once = true,
      viewport,
      viewportAmount = 0.2,
      className,
      children,
      variants: variantsProp,
      initial: initialProp,
      animate: animateProp,
      whileInView: whileInViewProp,
      ...rest
    },
    ref,
  ) => {
    const shouldApplyPreset = animateIn && animateProp === undefined;
    const resolvedVariants = variantsProp ??
      (shouldApplyPreset && variant ? onceMotionVariants[variant] : undefined);

    const initialValue = shouldApplyPreset && resolvedVariants
      ? initialProp ?? "hidden"
      : initialProp;
    const whileInViewValue = shouldApplyPreset && resolvedVariants
      ? whileInViewProp ?? "visible"
      : whileInViewProp;
    const resolvedViewport = shouldApplyPreset && resolvedVariants
      ? viewport ?? { once, amount: viewportAmount }
      : viewport;

    return (
      <MotionDiv
        ref={ref}
        className={cn("once-container", className)}
        variants={resolvedVariants}
        initial={initialValue}
        animate={animateProp}
        whileInView={whileInViewValue}
        viewport={resolvedViewport}
        {...rest}
      >
        {children}
      </MotionDiv>
    );
  },
);

OnceContainer.displayName = "OnceContainer";
