import React from "react";
import { barWidth, ChartProps } from ".";
interface BarChartProps extends ChartProps {
  barWidth?: barWidth;
  hover?: boolean;
  "data-viz-style"?: string;
}
declare const BarChart: React.FC<BarChartProps>;
export { BarChart };
export type { BarChartProps };
//# sourceMappingURL=BarChart.d.ts.map
