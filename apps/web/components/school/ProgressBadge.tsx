"use client";

import { cn } from "@/utils";

interface ProgressBadgeProps {
  completed: number;
  total: number;
  className?: string;
}

export function ProgressBadge(
  { completed, total, className }: ProgressBadgeProps,
) {
  const safeTotal = Math.max(total, 0);
  const percentage = safeTotal > 0
    ? Math.round((completed / safeTotal) * 100)
    : 0;
  const label = safeTotal > 0
    ? `${completed} of ${safeTotal} lessons`
    : "No lessons";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary",
        className,
      )}
    >
      <span>{label}</span>
      {safeTotal > 0 && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary/90">
          {percentage}%
        </span>
      )}
    </span>
  );
}
