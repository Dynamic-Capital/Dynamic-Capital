import * as React from "react";
import { icons } from "@/lib/lucide";
import type { LucideProps } from "@/lib/lucide";
import { cn } from "@/utils";

export type IconName = keyof typeof icons;

// Standardized icon sizes based on universal theme
const iconSizes = {
  xs: "icon-xs", // w-3 h-3
  sm: "icon-sm", // w-4 h-4
  base: "icon-base", // w-5 h-5
  lg: "icon-lg", // w-6 h-6
  xl: "icon-xl", // w-8 h-8
};

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  size?: keyof typeof iconSizes;
  animation?: "none" | "pulse" | "float" | "wiggle" | "glow";
  title?: string;
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    { name, size = "base", animation = "none", title, className, ...props },
    ref,
  ) => {
    const LucideIcon = icons[name] ?? icons.HelpCircle;

    const animationClasses = {
      none: "",
      pulse: "animate-pulse",
      float: "animate-float",
      wiggle: "animate-wiggle",
      glow: "animate-pulse-glow",
    };

    return (
      <LucideIcon
        ref={ref}
        className={cn(
          iconSizes[size],
          animationClasses[animation],
          "transition-all duration-200",
          className,
        )}
        aria-label={title}
        {...props}
      />
    );
  },
);

Icon.displayName = "Icon";

export { Icon };
