import * as React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { icons as lucideIcons } from "lucide-react/dist/esm/lucide-react";

import { cn } from "@/utils";

const iconLibrary: Record<string, LucideIcon> = lucideIcons as Record<
  string,
  LucideIcon
>;

export type IconName = keyof typeof iconLibrary;

const FALLBACK_ICON_NAME = "Circle" satisfies IconName;
const FALLBACK_ICON = iconLibrary[FALLBACK_ICON_NAME];

if (!FALLBACK_ICON) {
  throw new Error(
    `Icon component fallback "${FALLBACK_ICON_NAME}" is not available in lucide-react.`,
  );
}

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
    const resolvedIcon = iconLibrary[name];
    const LucideIcon = resolvedIcon ?? FALLBACK_ICON;

    if (!resolvedIcon && process.env.NODE_ENV !== "production") {
      console.warn(
        `Icon "${name}" is not registered in lucide-react. Falling back to "${FALLBACK_ICON_NAME}".`,
      );
    }

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
