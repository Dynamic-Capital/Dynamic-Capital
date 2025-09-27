import React from "react";
import { ChartProps } from "../../";
interface PieChartProps extends ChartProps {
  "data-viz-style"?: string;
  ring?: {
    inner: number;
    outer: number;
  };
  dataKey?: string;
  nameKey?: string;
  origo?: {
    x: number;
    y: number;
  };
}
export declare const PieChart: React.FC<PieChartProps>;
export {};
//# sourceMappingURL=PieChart.d.ts.map
