import React from "react";
import { Column, DateRange } from "../../components";
import { DateConfig, PresetsConfig } from "./interfaces";
interface ChartHeaderProps
  extends Omit<React.ComponentProps<typeof Column>, "title" | "description"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  dateRange?: DateRange;
  date?: DateConfig;
  onDateRangeChange?: (range: DateRange) => void;
  presets?: PresetsConfig;
}
export declare const ChartHeader: React.FC<ChartHeaderProps>;
export type { ChartHeaderProps };
//# sourceMappingURL=ChartHeader.d.ts.map
