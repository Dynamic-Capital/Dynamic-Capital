import React, { ReactNode } from "react";
export declare const DEFAULT_BREAKPOINTS: {
  readonly xs: 480;
  readonly s: 768;
  readonly m: 1024;
  readonly l: 1440;
  readonly xl: number;
};
export type BreakpointKey = keyof typeof DEFAULT_BREAKPOINTS;
export type Breakpoints = Record<BreakpointKey, number>;
interface LayoutContextType {
  currentBreakpoint: BreakpointKey;
  width: number;
  breakpoints: Breakpoints;
  isBreakpoint: (key: BreakpointKey) => boolean;
  maxWidth: (key: BreakpointKey) => boolean;
  minWidth: (key: BreakpointKey) => boolean;
}
interface LayoutProviderProps {
  children: ReactNode;
  breakpoints?: Partial<Breakpoints>;
}
declare const LayoutProvider: React.FC<LayoutProviderProps>;
export declare const useLayout: () => LayoutContextType;
export { LayoutProvider };
//# sourceMappingURL=LayoutProvider.d.ts.map
