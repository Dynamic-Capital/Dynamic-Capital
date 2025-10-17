"use client";

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
  Theme,
  ThemeProvider,
  ToastProvider,
  TransitionStyle,
} from "@once-ui-system/core";
import { useEffect, useMemo, useRef } from "react";

import { iconLibrary } from "@/resources/icons";
import { dataStyle, style } from "@/resources/once-ui.config";

type ThemeSyncArgs = {
  cssVariables?: Record<string, string> | null;
  accentTone?: string | null;
  neutralTone?: string | null;
  mode?: string | null;
};

const onceUiAttributes = {
  theme: style.theme,
  brand: style.brand,
  accent: style.accent,
  neutral: style.neutral,
  solid: style.solid,
  "solid-style": style.solidStyle,
  border: style.border,
  surface: style.surface,
  transition: style.transition,
  scaling: style.scaling,
  "viz-style": dataStyle.variant,
};

export function useSyncMiniAppThemeWithOnceUI({
  cssVariables,
  accentTone,
  neutralTone,
  mode,
}: ThemeSyncArgs) {
  const previousVariables = useRef<string[]>([]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;

    Object.entries(onceUiAttributes).forEach(([key, value]) => {
      root.setAttribute(`data-${key}`, String(value));
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;

    const themeValue = mode && mode !== "system" ? mode : style.theme;
    root.setAttribute("data-theme", themeValue);

    if (accentTone) {
      root.style.setProperty("--miniapp-once-accent", accentTone);
      root.setAttribute("data-accent", "contrast");
      root.setAttribute("data-brand", "custom");
    }

    if (neutralTone) {
      root.style.setProperty("--miniapp-once-neutral", neutralTone);
    }
  }, [accentTone, mode, neutralTone]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    previousVariables.current.forEach((key) => {
      root.style.removeProperty(key);
    });

    if (!cssVariables || Object.keys(cssVariables).length === 0) {
      previousVariables.current = [];
      return;
    }

    const appliedKeys: string[] = [];
    for (const [key, value] of Object.entries(cssVariables)) {
      if (typeof value !== "string") continue;
      root.style.setProperty(key, value);
      appliedKeys.push(key);
    }
    previousVariables.current = appliedKeys;
  }, [cssVariables]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const chartAxis = useMemo(
    () => ({ stroke: dataStyle.axis.stroke }),
    [],
  );
  const chartTick = useMemo(
    () => ({
      fill: dataStyle.tick.fill,
      fontSize: dataStyle.tick.fontSize,
      line: dataStyle.tick.line,
    }),
    [],
  );

  return (
    <LayoutProvider>
      <ThemeProvider
        theme={style.theme as Theme}
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
          axis={chartAxis}
          tick={chartTick}
        >
          <ToastProvider>
            <IconProvider icons={iconLibrary}>{children}</IconProvider>
          </ToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
