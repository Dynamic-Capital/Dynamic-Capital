"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface AdminListSkeletonProps {
  rows?: number;
}

export function AdminListSkeleton({ rows = 4 }: AdminListSkeletonProps) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-2xl border border-border/40 bg-card/70 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton height="s" width="m" />
            <Skeleton height="xs" width="s" />
          </div>
          <div className="space-y-2">
            <Skeleton height="s" width="xl" className="max-w-[18rem]" />
            <Skeleton height="s" width="l" className="max-w-[14rem]" />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <Skeleton height="xs" width="m" />
            <Skeleton height="xs" width="s" />
          </div>
        </div>
      ))}
    </div>
  );
}
