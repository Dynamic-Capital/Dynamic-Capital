import React, { ReactNode } from "react";
import { IconName } from "../icons";
import { ColorScheme, ColorWeight } from "../types";
import { Flex } from ".";
interface IconProps extends React.ComponentProps<typeof Flex> {
  name: IconName;
  onBackground?: `${ColorScheme}-${ColorWeight}`;
  onSolid?: `${ColorScheme}-${ColorWeight}`;
  size?: "xs" | "s" | "m" | "l" | "xl";
  decorative?: boolean;
  tooltip?: ReactNode;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  className?: string;
  style?: React.CSSProperties;
}
declare const Icon: React.ForwardRefExoticComponent<
  Omit<IconProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Icon };
//# sourceMappingURL=Icon.d.ts.map
