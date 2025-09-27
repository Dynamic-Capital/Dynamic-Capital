import React from "react";
import { Flex, MaskProps } from ".";
import { DisplayProps } from "../interfaces";
import { SpacingToken } from "../types";
interface GradientProps {
  display?: boolean;
  opacity?: DisplayProps["opacity"];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  tilt?: number;
  colorStart?: string;
  colorEnd?: string;
}
interface DotsProps {
  display?: boolean;
  opacity?: DisplayProps["opacity"];
  color?: string;
  size?: SpacingToken;
}
interface GridProps {
  display?: boolean;
  opacity?: DisplayProps["opacity"];
  color?: string;
  width?: string;
  height?: string;
}
interface LinesProps {
  display?: boolean;
  opacity?: DisplayProps["opacity"];
  size?: SpacingToken;
  thickness?: number;
  angle?: number;
  color?: string;
}
interface BackgroundProps extends React.ComponentProps<typeof Flex> {
  gradient?: GradientProps;
  dots?: DotsProps;
  grid?: GridProps;
  lines?: LinesProps;
  mask?: MaskProps;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
declare const Background: React.ForwardRefExoticComponent<
  Omit<BackgroundProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Background };
//# sourceMappingURL=Background.d.ts.map
