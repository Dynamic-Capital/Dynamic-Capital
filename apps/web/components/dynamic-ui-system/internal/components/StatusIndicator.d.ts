import React from "react";
import { Flex } from ".";
interface StatusIndicatorProps extends React.ComponentProps<typeof Flex> {
  size?: "s" | "m" | "l";
  color:
    | "blue"
    | "indigo"
    | "violet"
    | "magenta"
    | "pink"
    | "red"
    | "orange"
    | "yellow"
    | "moss"
    | "green"
    | "emerald"
    | "aqua"
    | "cyan"
    | "gray";
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}
declare const StatusIndicator: React.ForwardRefExoticComponent<
  Omit<StatusIndicatorProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { StatusIndicator };
//# sourceMappingURL=StatusIndicator.d.ts.map
