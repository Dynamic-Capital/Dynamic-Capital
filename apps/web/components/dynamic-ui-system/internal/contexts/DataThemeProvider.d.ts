import { ReactNode } from "react";
import { ChartMode, ChartVariant } from "../modules/data";
interface ChartOptions {
  variant: ChartVariant;
  mode: ChartMode;
  height: number;
  axis: {
    stroke: string;
  };
  tick: {
    fill: string;
    fontSize: number;
    line: boolean;
  };
}
interface DataThemeState extends ChartOptions {
  setChartOptions: (options: Partial<ChartOptions>) => void;
}
interface DataThemeProviderProps extends Partial<ChartOptions> {
  children: ReactNode;
}
declare const defaultChartOptions: ChartOptions;
export declare function DataThemeProvider(
  { children, variant, mode, height, axis, tick, ...rest }:
    DataThemeProviderProps,
): import("react/jsx-runtime").JSX.Element;
export declare const useDataTheme: () => DataThemeState;
export { defaultChartOptions };
//# sourceMappingURL=DataThemeProvider.d.ts.map
