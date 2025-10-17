"use client";

import type { ReactNode } from "react";
import {
  DataThemeProvider,
  IconProvider,
  LayoutProvider,
  ThemeProvider,
  ToastProvider,
  type IconLibrary,
} from "@once-ui-system/core";

import { dataStyle, style } from "@/resources/once-ui.config";

type ProvidersProps = {
  children: ReactNode;
  icons?: Partial<IconLibrary>;
};

export function Providers({ children, icons }: ProvidersProps) {
  const { variant, mode, height, axis, tick } = dataStyle;

  return (
    <LayoutProvider>
      <ThemeProvider
        theme={style.theme}
        neutral={style.neutral}
        brand={style.brand}
        accent={style.accent}
        solid={style.solid}
        solidStyle={style.solidStyle}
        border={style.border}
        surface={style.surface}
        transition={style.transition}
        scaling={style.scaling}
      >
        <DataThemeProvider
          variant={variant}
          mode={mode}
          height={height}
          axis={axis}
          tick={tick}
        >
          <ToastProvider>
            <IconProvider icons={icons}>{children}</IconProvider>
          </ToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
