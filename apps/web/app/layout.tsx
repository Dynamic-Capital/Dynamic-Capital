import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@once-ui-system/core/css/tokens.css";
import "@once-ui-system/core/css/styles.css";
import "./once-ui.css";
import "./globals.css";
import "@/lib/env";

import classNames from "classnames";
import {
  Background,
  Column,
  Flex,
  opacity,
  RevealFx,
  SpacingToken,
} from "@once-ui-system/core";

import Providers from "./providers";
import { getStaticLandingDocument } from "@/lib/staticLanding";
import {
  Footer,
  Header,
  RouteGuard,
  ScrollToHash,
} from "@/components/magic-portfolio";
import { dyamicUI } from "@/resources";

const SITE_URL = process.env.SITE_URL || "http://localhost:8080";
const DEFAULT_THEME = "dark" as const;
const THEME_SCRIPT_ID = "theme-init";

const {
  basics: basicsConfig,
  dataViz: dataVizConfig,
  effects: effectsConfig,
} = dyamicUI;
const { fonts, style } = basicsConfig;
const { dataStyle } = dataVizConfig;
const backgroundEffects = effectsConfig.background;

const htmlAttributeDefaults: Record<string, string> = {
  "data-neutral": style.neutral,
  "data-brand": style.brand,
  "data-accent": style.accent,
  "data-solid": style.solid,
  "data-solid-style": style.solidStyle,
  "data-border": style.border,
  "data-surface": style.surface,
  "data-transition": style.transition,
  "data-scaling": style.scaling,
  "data-viz-style": dataStyle.variant,
};

const themeAttributeDefaults = Object.fromEntries(
  Object.entries(htmlAttributeDefaults).map((
    [key, value],
  ) => [key.replace(/^data-/, ""), value]),
);

const onceThemeScript = `(function () {
  try {
    var root = document.documentElement;
    var defaultTheme = '${style.theme}';
    var attributes = ${JSON.stringify(themeAttributeDefaults)};

    Object.entries(attributes).forEach(function ([key, value]) {
      var attribute = 'data-' + key;
      if (!root.hasAttribute(attribute)) {
        root.setAttribute(attribute, value);
      }
    });

    var resolveTheme = function (themeValue) {
      if (!themeValue || themeValue === 'system') {
        var prefersDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
      }
      return themeValue;
    };

    var storedTheme = localStorage.getItem('data-theme');
    var resolvedTheme = resolveTheme(storedTheme || defaultTheme);
    root.setAttribute('data-theme', resolvedTheme);

    Object.keys(attributes).forEach(function (key) {
      var storageKey = 'data-' + key;
      var storedValue = localStorage.getItem(storageKey);
      if (storedValue) {
        root.setAttribute(storageKey, storedValue);
      }
    });
  } catch (error) {
    document.documentElement.setAttribute('data-theme', '${DEFAULT_THEME}');
  }
})();`;

function ensureThemeScript(markup: string): string {
  if (!markup) {
    return `<script id="${THEME_SCRIPT_ID}">${onceThemeScript}</script>`;
  }

  if (markup.includes(`id="${THEME_SCRIPT_ID}"`)) {
    return markup;
  }

  return `${markup}\n<script id="${THEME_SCRIPT_ID}">${onceThemeScript}</script>`;
}

function resolveMetadataBase(url: string) {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

const resolvedMetadataBase = resolveMetadataBase(SITE_URL);

export const metadata: Metadata = {
  metadataBase: resolvedMetadataBase,
  title: {
    default: "Dynamic Capital",
    template: "%s | Dynamic Capital",
  },
  description:
    "Dynamic Capital delivers institutional trading intelligence, mentorship, and automation for ambitious operators.",
  alternates: {
    canonical: resolvedMetadataBase?.toString() ?? SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: resolvedMetadataBase?.toString() ?? SITE_URL,
    siteName: "Dynamic Capital",
    title: "Dynamic Capital",
    description:
      "Dynamic Capital delivers institutional trading intelligence, mentorship, and automation for ambitious operators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dynamic Capital",
    description:
      "Dynamic Capital delivers institutional trading intelligence, mentorship, and automation for ambitious operators.",
  },
};

const fontClassName = classNames(
  fonts.heading.variable,
  fonts.body.variable,
  fonts.label.variable,
  fonts.code.variable,
);

export default async function RootLayout(
  { children }: { children: ReactNode },
) {
  const isStaticSnapshot =
    globalThis?.process?.env?.["STATIC_SNAPSHOT"] === "true";

  if (isStaticSnapshot) {
    const { head, body, lang } = await getStaticLandingDocument();
    return (
      <html
        lang={lang}
        suppressHydrationWarning
        className={fontClassName}
        {...htmlAttributeDefaults}
        data-theme={DEFAULT_THEME}
      >
        <head dangerouslySetInnerHTML={{ __html: ensureThemeScript(head) }} />
        <body
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </html>
    );
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={fontClassName}
      {...htmlAttributeDefaults}
      data-theme={DEFAULT_THEME}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo.png" />
        <script
          id={THEME_SCRIPT_ID}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: onceThemeScript }}
        />
      </head>
      <body>
        <Providers>
          <ScrollToHash />
          <Column
            as="div"
            background="page"
            fillWidth
            style={{ minHeight: "100vh" }}
            margin="0"
            padding="0"
            horizontal="center"
          >
            <RevealFx fill position="absolute">
              <Background
                mask={{
                  x: backgroundEffects.mask.x,
                  y: backgroundEffects.mask.y,
                  radius: backgroundEffects.mask.radius,
                  cursor: backgroundEffects.mask.cursor,
                }}
                gradient={{
                  display: backgroundEffects.gradient.display,
                  opacity: backgroundEffects.gradient.opacity as opacity,
                  x: backgroundEffects.gradient.x,
                  y: backgroundEffects.gradient.y,
                  width: backgroundEffects.gradient.width,
                  height: backgroundEffects.gradient.height,
                  tilt: backgroundEffects.gradient.tilt,
                  colorStart: backgroundEffects.gradient.colorStart,
                  colorEnd: backgroundEffects.gradient.colorEnd,
                }}
                dots={{
                  display: backgroundEffects.dots.display,
                  opacity: backgroundEffects.dots.opacity as opacity,
                  size: backgroundEffects.dots.size as SpacingToken,
                  color: backgroundEffects.dots.color,
                }}
                grid={{
                  display: backgroundEffects.grid.display,
                  opacity: backgroundEffects.grid.opacity as opacity,
                  color: backgroundEffects.grid.color,
                  width: backgroundEffects.grid.width,
                  height: backgroundEffects.grid.height,
                }}
                lines={{
                  display: backgroundEffects.lines.display,
                  opacity: backgroundEffects.lines.opacity as opacity,
                  size: backgroundEffects.lines.size as SpacingToken,
                  thickness: backgroundEffects.lines.thickness,
                  angle: backgroundEffects.lines.angle,
                  color: backgroundEffects.lines.color,
                }}
              />
            </RevealFx>
            <Flex fillWidth minHeight="16" s={{ hide: true }} />
            <Header />
            <Flex zIndex={0} fillWidth padding="l" horizontal="center" flex={1}>
              <Flex horizontal="center" fillWidth minHeight="0">
                <RouteGuard>{children}</RouteGuard>
              </Flex>
            </Flex>
            <Footer />
          </Column>
        </Providers>
      </body>
    </html>
  );
}
