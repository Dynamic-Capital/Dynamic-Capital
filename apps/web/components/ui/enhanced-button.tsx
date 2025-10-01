import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils";

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        brand: [
          "bg-gradient-brand text-white font-semibold shadow-lg",
          "hover:shadow-xl hover:shadow-primary/30 hover:scale-105",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        ],
        premium: [
          "bg-gradient-to-r from-primary via-accent to-primary text-white font-semibold",
          "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50",
          "hover:scale-105 animate-pulse-glow",
        ],
        glass: [
          "bg-background/10 dark:bg-foreground/10 backdrop-blur-md border border-border/20 text-foreground",
          "hover:bg-background/20 dark:hover:bg-foreground/20 hover:border-border/30 shadow-lg hover:shadow-xl",
        ],
        shimmer: [
          "bg-gradient-to-r from-primary via-accent to-primary text-white font-semibold",
          "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50",
          "hover:scale-105 relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
          "before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000",
          "before:animate-shimmer",
        ],
        attention: [
          "bg-gradient-to-r from-orange-500 via-dc-brand to-orange-500 text-white font-bold",
          "shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/50",
          "animate-attention hover:animate-none hover:scale-110",
          "border-2 border-orange-400/50 hover:border-orange-300",
          "relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500",
        ],
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface EnhancedButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    icon,
    iconPosition = "left",
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClassName = cn(
      enhancedButtonVariants({ variant, size, className }),
    );

    const renderContent = (innerChildren: React.ReactNode) => (
      <div className={cn("flex items-center gap-2", loading && "opacity-0")}>
        {icon && iconPosition === "left" ? icon : null}
        {innerChildren}
        {icon && iconPosition === "right" ? icon : null}
      </div>
    );

    if (asChild) {
      type ChildElement = React.ReactElement<{ children?: React.ReactNode }>;

      let onlyChild: ChildElement | null = null;

      try {
        onlyChild = React.Children.only(children) as ChildElement;
      } catch {
        onlyChild = null;
      }

      if (!onlyChild || !React.isValidElement(onlyChild)) {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            "[EnhancedButton]: `asChild` requires a single React element child.",
          );
        }
        return null;
      }

      const childWithContent = React.cloneElement(
        onlyChild,
        {
          ...(loading || disabled
            ? { disabled: Boolean(disabled || loading) }
            : null),
          ...(loading ? { "aria-busy": true } : null),
          children: (
            <>
              {loading
                ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </div>
                )
                : null}
              {renderContent(onlyChild.props.children)}
            </>
          ),
        } as Partial<ChildElement["props"]> & {
          children: React.ReactNode;
        },
      );

      const slotProps: React.ComponentPropsWithoutRef<typeof Slot> & {
        "aria-busy"?: React.AriaAttributes["aria-busy"];
      } = {
        className: baseClassName,
        ...props,
      };

      if (loading) {
        slotProps["aria-busy"] = true;
      }

      return (
        <Slot {...slotProps} ref={ref}>
          {childWithContent}
        </Slot>
      );
    }

    return (
      <button
        className={baseClassName}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading
          ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          )
          : null}

        {renderContent(children)}
      </button>
    );
  },
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton, enhancedButtonVariants };
