import React from "react";
import { BaseColor, Flex } from ".";
import { RadiusSize } from "@/types";
interface ScrollerProps extends React.ComponentProps<typeof Flex> {
  children?: React.ReactNode;
  direction?: "row" | "column";
  fadeColor?: BaseColor;
  onItemClick?: (index: number) => void;
  radius?: RadiusSize;
}
declare const Scroller: React.FC<ScrollerProps>;
export { Scroller };
export type { ScrollerProps };
//# sourceMappingURL=Scroller.d.ts.map
