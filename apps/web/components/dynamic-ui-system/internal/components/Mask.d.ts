import React from "react";
import { Flex } from ".";
export interface MaskProps
  extends Omit<React.ComponentProps<typeof Flex>, "radius" | "cursor"> {
  cursor?: boolean;
  x?: number;
  y?: number;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
declare const Mask: React.ForwardRefExoticComponent<
  Omit<MaskProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Mask };
//# sourceMappingURL=Mask.d.ts.map
