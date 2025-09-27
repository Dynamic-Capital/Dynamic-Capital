import React from "react";
import { ChartProps, curveType } from ".";
interface LineChartProps extends ChartProps {
  curve?: curveType;
  "data-viz-style"?: string;
}
declare const LineChart: React.FC<LineChartProps>;
export { LineChart };
export type { LineChartProps };
//# sourceMappingURL=LineChart.d.ts.map
