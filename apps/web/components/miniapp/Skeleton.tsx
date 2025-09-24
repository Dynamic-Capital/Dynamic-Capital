import type { CSSProperties } from "react";

interface SkeletonProps {
  h?: number;
  w?: number | string;
  r?: number;
  style?: CSSProperties;
}

export function Skeleton({ h = 16, w = "100%", r = 12, style }: SkeletonProps) {
  return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: r,
        background:
          "linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06))",
        animation: "pulse 1.2s ease-in-out infinite",
        ...style,
      }}
    />
  );
}
