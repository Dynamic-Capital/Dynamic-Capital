"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/utils";
import { ThreeButton } from "./three-button";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:scale-[1.02]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md hover:scale-[1.02]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-sm hover:scale-[1.02]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm hover:scale-[1.02]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]",
        link:
          "text-primary underline-offset-4 hover:underline hover:scale-[1.02]",
        telegram:
          "bg-gradient-to-r from-telegram to-telegram-dark text-white hover:from-telegram-dark hover:to-telegram shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300",
        "telegram-outline":
          "border-2 border-telegram text-telegram hover:bg-telegram hover:text-white hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        glass:
          "bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-300",
        subtle:
          "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-sm hover:scale-[1.02] transition-all duration-300",
        success:
          "bg-success text-success-foreground hover:bg-success/90 hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        info:
          "bg-info text-info-foreground hover:bg-info/90 hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        premium: [
          "bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        ],
        brand: [
          "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        ],
        three: "",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-8 rounded px-2 text-xs",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-md px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
      responsive: {
        true:
          "min-h-[44px] sm:min-h-[40px] touch-manipulation active:scale-95 transition-transform duration-150",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
      responsive: false,
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  responsive?: boolean;
}

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(value);
      } else {
        try {
          (ref as React.MutableRefObject<T | null>).current = value;
        } catch {
          // Ignore assignment errors for read-only refs.
        }
      }
    }
  };
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      fullWidth = false,
      responsive = false,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    if (variant === "three") {
      const { onClick, color, hoverColor } = rest as unknown as {
        onClick?: () => void;
        color?: string;
        hoverColor?: string;
      };

      return (
        <ThreeButton
          onClick={onClick}
          color={color}
          hoverColor={hoverColor}
          className={cn(fullWidth && "w-full", className)}
        >
          {children}
        </ThreeButton>
      );
    }

    const baseClassName = cn(
      buttonVariants({ variant, size, fullWidth, responsive }),
      className,
    );

    if (asChild) {
      if (!React.isValidElement(children)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[Button] `asChild` expects a single React element child. Rendering nothing.",
          );
        }
        return null;
      }

      const childElement = children as React.ReactElement<
        Record<string, unknown>
      >;
      const {
        children: childOriginalChildren,
        className: childClassName,
        onClick: originalOnClick,
        ...childRestProps
      } = childElement.props;

      const mergedClassName = cn(
        baseClassName,
        childClassName as string | undefined,
      );
      const mergedRef = mergeRefs(
        ref as React.Ref<HTMLElement>,
        (childElement as unknown as { ref?: React.Ref<HTMLElement> }).ref,
      );

      const { onClick, ...restProps } = rest;
      const disableInteraction = disabled || isLoading;

      const clonedProps: Record<string, unknown> = {
        ...childRestProps,
        ...restProps,
        className: mergedClassName,
        ref: mergedRef,
        "aria-busy": isLoading || (childRestProps["aria-busy"] as unknown),
      };

      if (disableInteraction) {
        if ("disabled" in childElement.props) {
          clonedProps.disabled =
            (childElement.props as Record<string, unknown>).disabled ?? true;
        } else {
          clonedProps["aria-disabled"] = true;
        }
      }

      if (
        disableInteraction ||
        typeof onClick === "function" ||
        typeof originalOnClick === "function"
      ) {
        clonedProps.onClick = (event: React.MouseEvent<unknown>) => {
          if (disableInteraction) {
            event.preventDefault();
          }

          if (typeof onClick === "function") {
            onClick(event as unknown as React.MouseEvent<HTMLButtonElement>);
          }

          if (!disableInteraction && typeof originalOnClick === "function") {
            (originalOnClick as (event: React.MouseEvent<unknown>) => void)(
              event,
            );
          }
        };
      }

      return React.cloneElement(
        childElement,
        clonedProps,
        <>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {childOriginalChildren as React.ReactNode}
        </>,
      );
    }

    const { onClick, type: buttonType = "button", ...buttonRest } = rest;

    return (
      <button
        className={baseClassName}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        ref={ref}
        type={buttonType}
        onClick={onClick}
        {...buttonRest}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
