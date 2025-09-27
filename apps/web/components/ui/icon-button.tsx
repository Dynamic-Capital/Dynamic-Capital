import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Icon, IconName } from "./icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { cn } from "@/utils";

const iconButtonVariants = cva(
  "ui-button ui-interactive rounded-full disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        subtle:
          "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80",
        telegram:
          "bg-telegram text-white hover:bg-telegram/90 hover:shadow-telegram",
      },
      size: {
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface IconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: IconName;
  iconAnimation?: "none" | "pulse" | "float" | "wiggle" | "glow";
  tooltip?: string;
  iconSize?: "xs" | "sm" | "base" | "lg" | "xl";
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant,
      size,
      icon,
      iconAnimation = "none",
      tooltip,
      iconSize,
      ...props
    },
    ref,
  ) => {
    // Map button size to icon size if not explicitly provided
    const getIconSize = () => {
      if (iconSize) return iconSize;
      switch (size) {
        case "sm":
          return "xs";
        case "lg":
          return "base";
        default:
          return "sm";
      }
    };

    const button = (
      <button
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <Icon
          name={icon}
          animation={iconAnimation}
          size={getIconSize()}
        />
      </button>
    );

    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  },
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
