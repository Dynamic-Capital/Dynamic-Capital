import React from "react";
import { SpacingToken } from "../types";
import { Flex } from ".";
interface RevealFxProps extends React.ComponentProps<typeof Flex> {
  children: React.ReactNode;
  speed?: "slow" | "medium" | "fast" | number;
  delay?: number;
  revealedByDefault?: boolean;
  translateY?: number | SpacingToken;
  trigger?: boolean;
  style?: React.CSSProperties;
  className?: string;
}
declare const RevealFx: React.ForwardRefExoticComponent<
  Omit<RevealFxProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { RevealFx };
//# sourceMappingURL=RevealFx.d.ts.map
