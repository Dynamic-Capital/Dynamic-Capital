import React from "react";
import { Text } from ".";
export interface CountFxProps extends React.ComponentProps<typeof Text> {
  value: number;
  speed?: number;
  easing?: "linear" | "ease-out" | "ease-in-out";
  format?: (value: number) => string;
  separator?: string;
  effect?: "simple" | "wheel" | "smooth";
  children?: React.ReactNode;
}
declare const CountFx: React.FC<CountFxProps>;
export { CountFx };
//# sourceMappingURL=CountFx.d.ts.map
