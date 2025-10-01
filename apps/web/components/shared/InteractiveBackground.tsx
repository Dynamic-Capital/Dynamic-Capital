import React from "react";
import { cn } from "@/utils";

interface InteractiveBackgroundProps {
  variant?: "dots" | "grid" | "gradient" | "waves";
  className?: string;
  animate?: boolean;
}

export const InteractiveBackground: React.FC<InteractiveBackgroundProps> = ({
  variant = "gradient",
  className,
  animate = true,
}) => {
  const backgroundClasses = cn(
    "absolute inset-0 -z-10 overflow-hidden",
    animate && "transition-all duration-1000",
    className,
  );

  if (variant === "dots") {
    return (
      <div className={backgroundClasses}>
        <div className="absolute inset-0 bg-gradient-hero">
          <div
            className="h-full w-full opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--primary)) 0.0625rem, transparent 0.0625rem)",
              backgroundSize: "1.25rem 1.25rem",
            }}
          />
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={backgroundClasses}>
        <div className="absolute inset-0 bg-gradient-hero">
          <div
            className="h-full w-full opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--primary)) 0.0625rem, transparent 0.0625rem),
                linear-gradient(90deg, hsl(var(--primary)) 0.0625rem, transparent 0.0625rem)
              `,
              backgroundSize: "1.25rem 1.25rem",
            }}
          />
        </div>
      </div>
    );
  }

  if (variant === "waves") {
    return (
      <div className={backgroundClasses}>
        <div className="absolute inset-0 bg-gradient-hero">
          <svg
            className="absolute bottom-0 left-0 w-full h-24 text-primary/10"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z"
              fill="currentColor"
              className={animate ? "animate-float" : ""}
            />
          </svg>
        </div>
      </div>
    );
  }

  // Default gradient variant
  return (
    <div className={backgroundClasses}>
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-brand rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" />
      <div
        className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/50 to-accent/50 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-br from-blue-400 to-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"
        style={{ animationDelay: "4s" }}
      />
    </div>
  );
};

export default InteractiveBackground;
