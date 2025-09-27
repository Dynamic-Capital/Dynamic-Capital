import React from "react";
import { Flex } from ".";
import { StyleProps } from "@/interfaces";
interface ProgressBarProps extends React.ComponentProps<typeof Flex> {
  value: number;
  min?: number;
  max?: number;
  label?: boolean;
  barBackground?: StyleProps["solid"];
  className?: string;
  style?: React.CSSProperties;
}
declare const ProgressBar: React.ForwardRefExoticComponent<
  Omit<ProgressBarProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { ProgressBar };
//# sourceMappingURL=ProgressBar.d.ts.map
