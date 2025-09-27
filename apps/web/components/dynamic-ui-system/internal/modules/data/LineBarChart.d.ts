import React from "react";
import { barWidth, ChartProps, curveType } from ".";
interface LineBarChartProps extends ChartProps {
  barWidth?: barWidth;
  curve?: curveType;
  "data-viz-style"?: string;
}
declare const LineBarChart: React.FC<LineBarChartProps>;
export { LineBarChart };
export type { LineBarChartProps };
//# sourceMappingURL=LineBarChart.d.ts.map
