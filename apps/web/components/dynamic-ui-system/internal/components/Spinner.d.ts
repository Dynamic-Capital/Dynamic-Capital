import React from "react";
import { Flex } from ".";
interface SpinnerProps extends React.ComponentProps<typeof Flex> {
  size?: "xs" | "s" | "m" | "l" | "xl";
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}
declare const Spinner: React.ForwardRefExoticComponent<
  Omit<SpinnerProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { Spinner };
//# sourceMappingURL=Spinner.d.ts.map
