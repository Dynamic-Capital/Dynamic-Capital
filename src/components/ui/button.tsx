import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:scale-[1.02]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md hover:scale-[1.02]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-sm hover:scale-[1.02]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm hover:scale-[1.02]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]",
        link: "text-primary underline-offset-4 hover:underline hover:scale-[1.02]",
        telegram: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300",
        "telegram-outline": "border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-300",
        subtle: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:shadow-sm hover:scale-[1.02] transition-all duration-300",
        success: "bg-green-500 text-white hover:bg-green-600 hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        info: "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md hover:scale-[1.02] transition-all duration-300",
        premium: [
          "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
        ],
        brand: [
          "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
        ]
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-8 rounded px-2 text-xs",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-12 rounded-md px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12"
      },
      fullWidth: {
        true: "w-full",
        false: ""
      },
      responsive: {
        true: "min-h-[44px] sm:min-h-[40px] touch-manipulation active:scale-95 transition-transform duration-150",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
      responsive: false
    },
  }
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
