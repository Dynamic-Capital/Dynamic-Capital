import { cn } from "@/utils";
import { type HTMLMotionProps, motion } from "framer-motion";

type SkeletonShape = "line" | "circle" | "block";
type SkeletonSizeToken = "xs" | "s" | "m" | "l" | "xl";
type SkeletonDelayToken = 1 | 2 | 3 | 4 | 5 | 6;

const widthClasses: Record<SkeletonSizeToken, string> = {
  xs: "w-12",
  s: "w-20",
  m: "w-32",
  l: "w-48",
  xl: "w-64",
};

const heightClasses: Record<SkeletonSizeToken, string> = {
  xs: "h-2",
  s: "h-3",
  m: "h-4",
  l: "h-6",
  xl: "h-8",
};

const shapeClasses: Record<SkeletonShape, string> = {
  line: "rounded-full",
  circle: "rounded-full",
  block: "rounded-xl",
};

const delayTimings: Record<SkeletonDelayToken, number> = {
  1: 0.1,
  2: 0.2,
  3: 0.3,
  4: 0.4,
  5: 0.5,
  6: 0.6,
};

interface SkeletonProps extends HTMLMotionProps<"div"> {
  shape?: SkeletonShape;
  width?: SkeletonSizeToken;
  height?: SkeletonSizeToken;
  delay?: SkeletonDelayToken;
}

function Skeleton({
  shape = "line",
  width,
  height,
  delay,
  className,
  style,
  ...props
}: SkeletonProps) {
  const resolvedWidth = width
    ? widthClasses[width]
    : shape === "circle"
    ? widthClasses.m
    : "w-full";

  const resolvedHeight = height
    ? heightClasses[height]
    : shape === "circle"
    ? heightClasses.m
    : shape === "line"
    ? heightClasses.m
    : undefined;

  const resolvedTransitionDelay = delay ? delayTimings[delay] : 0;

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "relative isolate overflow-hidden bg-muted/70",
        shapeClasses[shape],
        resolvedWidth,
        resolvedHeight,
        className,
      )}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        delay: resolvedTransitionDelay,
      }}
      style={{
        ...style,
      }}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 animate-shimmer"
      />
    </motion.div>
  );
}

export { Skeleton };
