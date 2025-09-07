import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ui-button ui-press focus-ring-pop font-medium [&_svg]:shrink-0 ui-rounded-base transition-all duration-200 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline: "ui-border-thin bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground ui-rounded-base",
        link: "text-primary underline-offset-4 hover:underline ui-rounded-sm",
        telegram: "bg-gradient-telegram text-white hover:shadow-telegram ui-interactive hover:scale-105",
        "telegram-outline": "ui-border-medium border-telegram bg-transparent text-telegram hover:bg-telegram hover:text-white",
        glass: "glass-button text-white ui-border-accent hover:scale-105",
        subtle: "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 ui-border-thin",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-md",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm hover:shadow-md",
        premium: [
          "bg-gradient-to-r from-primary via-purple-500 to-primary text-white font-semibold",
          "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50",
          "hover:scale-105 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
        ],
        brand: [
          "bg-gradient-brand text-white font-semibold shadow-lg",
          "hover:shadow-xl hover:shadow-primary/30 hover:scale-105",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
        ]
      },
      size: {
        xs: "h-7 px-2 text-xs [&_svg]:icon-xs ui-p-xs rounded-md",
        sm: "ui-button-sm [&_svg]:icon-xs ui-p-xs",
        default: "ui-button-base [&_svg]:icon-sm ui-p-sm", 
        lg: "ui-button-lg [&_svg]:icon-base ui-p-base",
        xl: "h-12 px-8 text-base [&_svg]:icon-lg ui-p-lg rounded-lg",
        icon: "h-10 w-10 [&_svg]:icon-sm ui-p-sm ui-rounded-base",
        "icon-sm": "h-8 w-8 [&_svg]:icon-xs ui-p-xs rounded-md",
        "icon-lg": "h-12 w-12 [&_svg]:icon-base ui-p-base rounded-lg",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto"
      },
      responsive: {
        true: "text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12 px-2 sm:px-4 lg:px-6",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
      responsive: false
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, fullWidth = false, responsive = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, fullWidth, responsive }),
          className
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        ref={ref}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
