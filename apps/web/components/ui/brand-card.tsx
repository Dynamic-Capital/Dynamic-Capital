import React from "react";
import { cn } from "@/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BrandCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  variant?: "default" | "brand" | "glass" | "elevated";
  className?: string;
  interactive?: boolean;
  gradient?: boolean;
}

export const BrandCard: React.FC<BrandCardProps> = ({
  title,
  description,
  children,
  variant = "default",
  className,
  interactive = false,
  gradient = false,
}) => {
  const cardClasses = cn(
    "transition-all duration-300",
    {
      // Default styling
      "bg-card text-card-foreground border": variant === "default",

      // Brand styling with Dynamic Capital colors
      "bg-gradient-brand text-white border-none shadow-xl shadow-primary/20":
        variant === "brand",

      // Glass morphism effect
      "bg-white/10 backdrop-blur-md border border-white/20 text-foreground shadow-lg":
        variant === "glass",

      // Elevated card with enhanced shadow
      "bg-card text-card-foreground border-none shadow-2xl shadow-primary/10":
        variant === "elevated",

      // Interactive effects
      "hover:scale-[1.02] hover:shadow-xl cursor-pointer": interactive,

      // Gradient background overlay
      "relative overflow-hidden": gradient,
    },
    className,
  );

  return (
    <Card className={cardClasses}>
      {gradient && (
        <div className="absolute inset-0 bg-gradient-hero opacity-50 pointer-events-none" />
      )}

      {(title || description) && (
        <CardHeader className="relative z-10">
          {title && (
            <CardTitle
              className={cn(
                "text-lg font-semibold",
                variant === "brand" && "text-white",
                variant === "glass" && "text-foreground",
              )}
            >
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription
              className={cn(
                variant === "brand" && "text-white/80",
                variant === "glass" && "text-muted-foreground",
              )}
            >
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent className="relative z-10">
        {children}
      </CardContent>
    </Card>
  );
};

export default BrandCard;
