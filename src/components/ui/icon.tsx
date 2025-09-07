import * as React from "react";
import { icons, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconName = keyof typeof icons;

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  animation?: "none" | "pulse" | "float" | "wiggle" | "glow";
  title?: string;
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ name, animation = "none", title, className, ...props }, ref) => {
    const LucideIcon = icons[name];

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
        className={cn(animationClasses[animation], className)}
        aria-label={title}
        {...props}
      />
    );
  }
);

Icon.displayName = "Icon";

export { Icon };