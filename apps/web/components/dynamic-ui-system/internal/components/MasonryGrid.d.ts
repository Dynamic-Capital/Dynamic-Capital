import React from "react";
import type { CSSProperties, ReactNode } from "react";
import { SpacingToken } from "../types";
import { Flex } from "./Flex";
interface MasonryGridProps extends React.ComponentProps<typeof Flex> {
  children: ReactNode;
  gap?: SpacingToken | "-1" | undefined;
  columns?: number;
  style?: CSSProperties;
  className?: string;
}
declare const MasonryGrid: React.ForwardRefExoticComponent<
  Omit<MasonryGridProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { MasonryGrid };
//# sourceMappingURL=MasonryGrid.d.ts.map
