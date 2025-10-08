"use client";

import type { ReactNode } from "react";

import {
  BorderStyle,
  ChartMode,
  ChartVariant,
  DataThemeProvider,
  IconProvider,
  LayoutProvider,
  NeutralColor,
  ScalingSize,
  Schemes,
  SolidStyle,
  SolidType,
  SurfaceStyle,
  ThemeProvider,
  ToastProvider as DynamicToastProvider,
  TransitionStyle,
} from "@/components/dynamic-ui-system";
import { MotionConfigProvider } from "@/components/ui/motion-config";
import { dynamicUI } from "@/resources";
import { iconLibrary } from "@/resources/icons";

interface PageProvidersProps {
  readonly children: ReactNode;
}

const {
  basics: basicsConfig,
  dataViz: dataVizConfig,
} = dynamicUI;
const { style } = basicsConfig;
const { dataStyle } = dataVizConfig;

export function PageProviders({ children }: PageProvidersProps) {
  return (
    <LayoutProvider>
      <ThemeProvider
        brand={style.brand as Schemes}
        accent={style.accent as Schemes}
        neutral={style.neutral as NeutralColor}
        solid={style.solid as SolidType}
        solidStyle={style.solidStyle as SolidStyle}
        border={style.border as BorderStyle}
        surface={style.surface as SurfaceStyle}
        transition={style.transition as TransitionStyle}
        scaling={style.scaling as ScalingSize}
      >
        <DataThemeProvider
          variant={dataStyle.variant as ChartVariant}
          mode={dataStyle.mode as ChartMode}
          height={dataStyle.height}
          axis={{
            stroke: dataStyle.axis.stroke,
          }}
          tick={{
            fill: dataStyle.tick.fill,
            fontSize: dataStyle.tick.fontSize,
            line: dataStyle.tick.line,
          }}
        >
          <DynamicToastProvider>
            <IconProvider icons={iconLibrary}>
              <MotionConfigProvider>{children}</MotionConfigProvider>
            </IconProvider>
          </DynamicToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}

export default PageProviders;
