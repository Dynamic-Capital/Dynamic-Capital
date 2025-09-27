import React from "react";
import { ChartVariant } from "./interfaces";
interface LegendProps {
  payload?: any[];
  labels?: "x" | "y" | "both" | "none";
  colors?: string[];
  direction?: "row" | "column";
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  variant?: ChartVariant;
}
declare const Legend: React.FC<LegendProps>;
export { Legend };
export type { LegendProps };
//# sourceMappingURL=Legend.d.ts.map
