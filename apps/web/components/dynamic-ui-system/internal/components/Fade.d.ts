import React, { ReactNode } from "react";
import { Flex } from ".";
import { ColorScheme, ColorWeight, SpacingToken } from "../types";
export type BaseColor =
  | `${ColorScheme}-${ColorWeight}`
  | `${ColorScheme}-alpha-${ColorWeight}`
  | "surface"
  | "overlay"
  | "page"
  | "transparent";
interface FadeProps extends React.ComponentProps<typeof Flex> {
  className?: string;
  to?: "bottom" | "top" | "left" | "right";
  base?: BaseColor;
  blur?: number;
  pattern?: {
    display?: boolean;
    size?: SpacingToken;
  };
  style?: React.CSSProperties;
  children?: ReactNode;
}
declare const Fade: React.ForwardRefExoticComponent<
  Omit<FadeProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Fade };
//# sourceMappingURL=Fade.d.ts.map
