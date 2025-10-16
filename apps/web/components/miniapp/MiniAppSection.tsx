"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/lib/utils";

type MiniAppSectionProps = ComponentPropsWithoutRef<"section"> & {
  contentClassName?: string;
};

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
        <div
          className={cn(
            "flex flex-col gap-5 p-5 sm:gap-6 sm:p-6 lg:p-7",
            contentClassName,
          )}
        >
          {children}
        </div>
      </section>
    );
  },
);

MiniAppSection.displayName = "MiniAppSection";
