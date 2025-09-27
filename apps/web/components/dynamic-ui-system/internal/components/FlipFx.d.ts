import React from "react";
import { Flex } from ".";
export interface FlipFxProps extends React.ComponentProps<typeof Flex> {
  flipDirection?: "horizontal" | "vertical";
  timing?: number;
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  disableClickFlip?: boolean;
  autoFlipInterval?: number;
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
declare const FlipFx: React.ForwardRefExoticComponent<
  Omit<FlipFxProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { FlipFx };
//# sourceMappingURL=FlipFx.d.ts.map
