import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/utils";
import { dynamicMotionVariants } from "@/lib/motion-variants";

type MotionButtonProps = React.ComponentPropsWithoutRef<typeof motion.button>;

export interface DynamicButtonProps extends MotionButtonProps {
  /**
   * Applies the Dynamic UI button skin. Defaults to the solid primary button.
   */
  variant?: "primary" | "outline";
  /**
   * Uses the compact padding defined in dynamic-ui.css.
   */
  size?: "default" | "small";
}

const MotionButton = motion.button;

export const DynamicButton = React.forwardRef<
  HTMLButtonElement,
  DynamicButtonProps
>(
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
    ref,
  ) => {
    const { type: buttonType, ...otherProps } = rest;
    const motionVariants = variantsProp ?? dynamicMotionVariants.button;
    const initialValue = initialProp ?? "initial";
    const animateValue = animateProp ?? (disabled ? "disabled" : "initial");
    const hoverValue = disabled ? undefined : whileHoverProp ?? "hover";
    const tapValue = disabled ? undefined : whileTapProp ?? "tap";

    return (
      <MotionButton
        ref={ref}
        className={cn(
          "dynamic-btn",
          variant,
          size === "small" && "small",
          className,
        )}
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
  },
);

DynamicButton.displayName = "DynamicButton";
