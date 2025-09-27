import { Row } from ".";
import React from "react";
interface AutoScrollProps extends React.ComponentProps<typeof Row> {
  children: React.ReactNode;
  speed?: "slow" | "medium" | "fast";
  hover?: "slow" | "pause" | "none";
  reverse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  scrollGap?: number | string;
}
declare const AutoScroll: React.ForwardRefExoticComponent<
  Omit<AutoScrollProps, "ref"> & React.RefAttributes<HTMLDivElement>
>;
export { AutoScroll };
//# sourceMappingURL=AutoScroll.d.ts.map
