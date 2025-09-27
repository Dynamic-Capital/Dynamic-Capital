import React from "react";
import { Flex } from ".";
interface SkeletonProps extends React.ComponentProps<typeof Flex> {
  shape: "line" | "circle" | "block";
  width?: "xl" | "l" | "m" | "s" | "xs";
  height?: "xl" | "l" | "m" | "s" | "xs";
  delay?: "1" | "2" | "3" | "4" | "5" | "6";
  style?: React.CSSProperties;
  className?: string;
}
declare const Skeleton: React.FC<SkeletonProps>;
export { Skeleton };
//# sourceMappingURL=Skeleton.d.ts.map
