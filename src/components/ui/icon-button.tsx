import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Icon, IconName } from "./icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover-rise btn-press",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        subtle: "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80",
        telegram: "bg-telegram text-white hover:bg-telegram/90 hover:shadow-telegram",
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
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: IconName;
  iconAnimation?: "none" | "pulse" | "float" | "wiggle" | "glow";
  tooltip?: string;
  iconSize?: number;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, iconAnimation = "none", tooltip, iconSize, ...props }, ref) => {
    const button = (
      <button
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <Icon 
          name={icon} 
          animation={iconAnimation}
          size={iconSize || (size === "sm" ? 16 : size === "lg" ? 20 : 18)}
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
  }
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };