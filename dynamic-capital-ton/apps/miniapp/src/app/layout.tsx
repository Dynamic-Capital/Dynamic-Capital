import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Meta } from "@once-ui-system/core";

import { Providers } from "@/components/Providers";
import { baseURL, dataStyle, fonts, meta, style } from "@/resources/once-ui.config";

const fontVariables = Object.values(fonts)
  .map(({ variable }) => variable)
  .join(" ");

const themeBootstrapScript = `
  (function() {
    try {
      const root = document.documentElement;
      const defaultTheme = ${JSON.stringify(style.theme)};
      root.setAttribute('data-neutral', ${JSON.stringify(style.neutral)});
      root.setAttribute('data-brand', ${JSON.stringify(style.brand)});
      root.setAttribute('data-accent', ${JSON.stringify(style.accent)});
      root.setAttribute('data-solid', ${JSON.stringify(style.solid)});
      root.setAttribute('data-solid-style', ${JSON.stringify(style.solidStyle)});
      root.setAttribute('data-border', ${JSON.stringify(style.border)});
      root.setAttribute('data-surface', ${JSON.stringify(style.surface)});
      root.setAttribute('data-transition', ${JSON.stringify(style.transition)});
      root.setAttribute('data-scaling', ${JSON.stringify(style.scaling)});
      root.setAttribute('data-viz-style', ${JSON.stringify(dataStyle.mode)});

      const resolveTheme = (themeValue) => {
        if (!themeValue || themeValue === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return themeValue;
      };

      const storedTheme = window.localStorage.getItem('data-theme');
      const resolvedTheme = resolveTheme(storedTheme ?? defaultTheme);
      root.setAttribute('data-theme', resolvedTheme);

      const styleKeys = ['neutral', 'brand', 'accent', 'solid', 'solid-style', 'border', 'surface', 'transition', 'scaling', 'viz-style'];
      styleKeys.forEach((key) => {
        const storageKey = 'data-' + key;
        const storedValue = window.localStorage.getItem(storageKey);
        if (storedValue) {
          root.setAttribute(storageKey, storedValue);
        }
      });
    } catch (error) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
`;

const { alternates, ...homeMeta } = meta.home;

export const metadata: Metadata = Meta.generate({
  ...homeMeta,
  alternates: alternates ? [...alternates] : undefined,
  baseURL,
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={style.theme}
      data-neutral={style.neutral}
      data-brand={style.brand}
      data-accent={style.accent}
      data-solid={style.solid}
      data-solid-style={style.solidStyle}
      data-border={style.border}
      data-surface={style.surface}
      data-transition={style.transition}
      data-scaling={style.scaling}
      data-viz-style={dataStyle.mode}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={fontVariables}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
