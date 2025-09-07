import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ui-button ui-press focus-ring-pop font-medium text-sm [&_svg]:shrink-0 ui-rounded-base transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline: "ui-border-thin bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground ui-rounded-base",
        link: "text-primary underline-offset-4 hover:underline ui-rounded-sm",
        telegram: "bg-gradient-telegram text-white hover:shadow-telegram ui-interactive",
        "telegram-outline": "ui-border-medium border-telegram bg-transparent text-telegram hover:bg-telegram hover:text-white",
        glass: "glass-button text-white ui-border-accent",
        subtle: "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 ui-border-thin",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-md",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm hover:shadow-md",
      },
      size: {
        sm: "ui-button-sm [&_svg]:icon-xs ui-p-xs",
        default: "ui-button-base [&_svg]:icon-sm ui-p-sm", 
        lg: "ui-button-lg [&_svg]:icon-base ui-p-base",
        icon: "h-10 w-10 [&_svg]:icon-sm ui-p-sm ui-rounded-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, fullWidth = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
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
