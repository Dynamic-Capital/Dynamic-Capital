import React, { ReactNode } from "react";
import { Flex } from ".";
import { IconName } from "../icons";
interface TooltipProps extends React.ComponentProps<typeof Flex> {
  label: ReactNode;
  prefixIcon?: IconName;
  suffixIcon?: IconName;
  className?: string;
  style?: React.CSSProperties;
}
declare const Tooltip: React.ForwardRefExoticComponent<
  Omit<TooltipProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Tooltip };
//# sourceMappingURL=Tooltip.d.ts.map
