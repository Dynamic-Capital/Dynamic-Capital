"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/utils";
import {
  type DynamicMotionVariantKey,
  dynamicMotionVariants,
} from "@/lib/motion-variants";

type MotionDivProps = React.ComponentPropsWithoutRef<typeof motion.div>;

export interface DynamicContainerProps extends MotionDivProps {
  /**
   * Default animation preset triggered when the container enters the viewport.
   */
  variant?: DynamicMotionVariantKey | null;
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

export const DynamicContainer = React.forwardRef<
  HTMLDivElement,
  DynamicContainerProps
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
    const {
      variants: resolvedVariants,
      initial: initialValue,
      whileInView: whileInViewValue,
      viewport: resolvedViewport,
    } = React.useMemo(() => {
      const shouldApplyPreset = animateIn && animateProp === undefined;
      const resolvedVariants = variantsProp ??
        (shouldApplyPreset && variant
          ? dynamicMotionVariants[variant]
          : undefined);

      if (!resolvedVariants) {
        return {
          variants: variantsProp,
          initial: initialProp,
          whileInView: whileInViewProp,
          viewport,
        } as const;
      }

      return {
        variants: resolvedVariants,
        initial: shouldApplyPreset ? initialProp ?? "hidden" : initialProp,
        whileInView: shouldApplyPreset
          ? whileInViewProp ?? "visible"
          : whileInViewProp,
        viewport: shouldApplyPreset
          ? viewport ?? { once, amount: viewportAmount }
          : viewport,
      } as const;
    }, [
      animateIn,
      animateProp,
      initialProp,
      once,
      variant,
      variantsProp,
      viewport,
      viewportAmount,
      whileInViewProp,
    ]);

    return (
      <MotionDiv
        ref={ref}
        className={cn("dynamic-container", className)}
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

DynamicContainer.displayName = "DynamicContainer";
