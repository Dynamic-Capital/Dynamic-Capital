"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MiniAppGridProps {
  id?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function MiniAppGrid({
  id,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: MiniAppGridProps) {
  return (
    <section
      id={id}
      className={cn(
        "miniapp-grid space-y-6",
        "md:space-y-8",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {title}
          </h2>
          {description
            ? (
              <p className="text-sm text-muted-foreground md:text-base">
                {description}
              </p>
            )
            : null}
        </div>
        {actions
          ? <div className="flex shrink-0 items-center gap-2">{actions}</div>
          : null}
      </div>
      <div
        className={cn(
          "grid gap-4 md:grid-cols-2 md:gap-5 lg:gap-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default MiniAppGrid;
