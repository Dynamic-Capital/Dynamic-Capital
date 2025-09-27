import React from "react";
import { ChartVariant, DateConfig } from "./interfaces";
interface DataTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  dataKey?: string;
  DataTooltip?: React.ReactNode;
  date?: DateConfig;
  colors?: boolean;
  variant?: ChartVariant;
}
declare const DataTooltip: React.FC<DataTooltipProps>;
export { DataTooltip };
export type { DataTooltipProps };
//# sourceMappingURL=DataTooltip.d.ts.map
