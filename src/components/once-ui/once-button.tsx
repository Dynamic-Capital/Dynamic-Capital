"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/utils";
import { onceMotionVariants } from "@/lib/motion-variants";

type MotionButtonProps = React.ComponentPropsWithoutRef<typeof motion.button>;

export interface OnceButtonProps extends MotionButtonProps {
  /**
   * Applies the Once UI button skin. Defaults to the solid primary button.
   */
  variant?: "primary" | "outline";
  /**
   * Uses the compact padding defined in once-ui.css.
   */
  size?: "default" | "small";
}

const MotionButton = motion.button;

export const OnceButton = React.forwardRef<HTMLButtonElement, OnceButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      className,
      disabled,
      children,
      variants: variantsProp,
      initial: initialProp,
      animate: animateProp,
      whileHover: whileHoverProp,
      whileTap: whileTapProp,
      ...rest
    },
    ref
  ) => {
    const { type: buttonType, ...otherProps } = rest;
    const motionVariants = variantsProp ?? onceMotionVariants.button;
    const initialValue = initialProp ?? "initial";
    const animateValue = animateProp ?? (disabled ? "disabled" : "initial");
    const hoverValue = disabled ? undefined : whileHoverProp ?? "hover";
    const tapValue = disabled ? undefined : whileTapProp ?? "tap";

    return (
      <MotionButton
        ref={ref}
        className={cn("once-btn", variant, size === "small" && "small", className)}
        disabled={disabled}
        type={buttonType ?? "button"}
        variants={motionVariants}
        initial={initialValue}
        animate={animateValue}
        whileHover={hoverValue}
        whileTap={tapValue}
        {...otherProps}
      >
        {children}
      </MotionButton>
    );
  }
);

OnceButton.displayName = "OnceButton";
