"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/lib/utils";

type MiniAppSectionTone = "raised" | "muted" | "plain";

type MiniAppSectionProps = ComponentPropsWithoutRef<"section"> & {
  contentClassName?: string;
  tone?: MiniAppSectionTone;
};

const toneClassMap: Record<MiniAppSectionTone, string> = {
  raised: "miniapp-panel",
  muted: "miniapp-panel miniapp-panel--muted",
  plain: "miniapp-panel miniapp-panel--plain",
};

export const MiniAppSection = forwardRef<HTMLElement, MiniAppSectionProps>(
  (
    { className, children, contentClassName, tone = "raised", ...props },
    ref,
  ) => {
    return (
      <section
        ref={ref}
        className={cn(toneClassMap[tone], "overflow-hidden", className)}
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
