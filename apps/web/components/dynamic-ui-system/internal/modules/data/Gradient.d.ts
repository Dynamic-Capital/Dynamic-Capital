import React from "react";
import { ChartVariant } from "./interfaces";
interface GradientStop {
  offset: string;
  opacity: number;
  variant?: ChartVariant;
}
interface LinearGradientProps {
  id: string;
  color: string;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  stops?: GradientStop[];
  variant?: ChartVariant;
}
interface RadialGradientProps {
  id: string;
  color: string;
  cx?: string;
  cy?: string;
  r?: string;
  fx?: string;
  fy?: string;
  stops?: GradientStop[];
  variant?: ChartVariant;
}
export declare const LinearGradient: React.FC<LinearGradientProps>;
export declare const RadialGradient: React.FC<RadialGradientProps>;
export {};
//# sourceMappingURL=Gradient.d.ts.map
