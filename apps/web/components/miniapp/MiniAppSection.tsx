"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";

interface MiniAppSectionProps extends React.HTMLAttributes<HTMLElement> {
  contentClassName?: string;
}

export const MiniAppSection = forwardRef<HTMLElement, MiniAppSectionProps>(
  ({ className, children, contentClassName, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "miniapp-panel overflow-hidden border border-border/40", 
          "bg-background/80 shadow-[0_20px_60px_hsl(var(--primary)/0.12)]",
          className,
        )}
        {...props}
      >
        <div className={cn("flex flex-col gap-6 p-6", contentClassName)}>
          {children}
        </div>
      </section>
    );
  },
);

MiniAppSection.displayName = "MiniAppSection";
