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
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-5/6 rounded-full" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
