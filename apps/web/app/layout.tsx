import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/components/dynamic-ui-system/css/tokens.css";
import "@/components/dynamic-ui-system/css/styles.css";
import "./dynamic-ui.css";
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
} from "@/components/dynamic-ui-system";

import Providers from "./providers";
import { getStaticLandingDocument } from "@/lib/staticLanding";
import { RouteGuard, ScrollToHash } from "@/components/dynamic-portfolio";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { SkipToContent } from "@/components/navigation/SkipToContent";
import { dynamicBranding, dynamicUI } from "@/resources";

const SITE_URL = process.env.SITE_URL || "http://localhost:8080";
const THEME_SCRIPT_ID = "theme-init";
const BRANDING_STYLE_ELEMENT_ID = "dynamic-branding-tokens";

const {
  basics: basicsConfig,
  dataViz: dataVizConfig,
  effects: effectsConfig,
} = dynamicUI;
const { fonts, style } = basicsConfig;
const brandingMetadata = dynamicBranding.metadata;
const brandingAssets = dynamicBranding.assets;
const brandingTokens = dynamicBranding.tokens;
const brandingPalette = dynamicBranding.palette;
const { dataStyle } = dataVizConfig;
const backgroundEffects = effectsConfig.background;

const DEFAULT_THEME = style.theme === "light" || style.theme === "dark"
  ? style.theme
  : "dark";

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

const dynamicBrandingStyles = createBrandingStyles(brandingTokens);
const dynamicBrandingStyleMarkup =
  `<style id="${BRANDING_STYLE_ELEMENT_ID}">${dynamicBrandingStyles}</style>`;
const dynamicThemeScript = `(function () {
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
const dynamicThemeScriptMarkup =
  `<script id="${THEME_SCRIPT_ID}">${dynamicThemeScript}</script>`;

function ensureThemeAssets(markup: string): string {
  const fragments: string[] = [];
  const existingMarkup = markup ?? "";

  if (existingMarkup) {
    fragments.push(existingMarkup);
  }

  if (!existingMarkup.includes(`id="${BRANDING_STYLE_ELEMENT_ID}"`)) {
    fragments.push(dynamicBrandingStyleMarkup);
  }

  if (!existingMarkup.includes(`id="${THEME_SCRIPT_ID}"`)) {
    fragments.push(dynamicThemeScriptMarkup);
  }

  return fragments.join("\n");
}

function createBrandingStyles(tokens: typeof brandingTokens): string {
  const lightTokens = serializeBrandingTokens(tokens.light);
  const darkTokens = serializeBrandingTokens(tokens.dark);

  return [
    ':root, [data-theme="light"] {',
    lightTokens,
    "  color-scheme: light;",
    "}",
    "",
    '[data-theme="dark"] {',
    darkTokens,
    "  color-scheme: dark;",
    "}",
  ].join("\n");
}

function serializeBrandingTokens(tokenSet: Record<string, string>): string {
  return Object.entries(tokenSet)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

function resolveMetadataBase(url: string) {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

const resolvedMetadataBase = resolveMetadataBase(SITE_URL);
const themeColorMeta = [
  {
    media: "(prefers-color-scheme: light)",
    color: `hsl(${brandingPalette.brand.base})`,
  },
  {
    media: "(prefers-color-scheme: dark)",
    color: `hsl(${brandingPalette.brand.dark})`,
  },
];

export const metadata: Metadata = {
  metadataBase: resolvedMetadataBase,
  applicationName: brandingMetadata.name,
  title: {
    default: brandingMetadata.name,
    template: `%s | ${brandingMetadata.name}`,
  },
  description: brandingMetadata.description,
  keywords: brandingMetadata.keywords,
  alternates: {
    canonical: resolvedMetadataBase?.toString() ?? SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: resolvedMetadataBase?.toString() ?? SITE_URL,
    siteName: brandingMetadata.name,
    title: brandingMetadata.name,
    description: brandingMetadata.description,
    ...(brandingAssets.socialPreview
      ? {
        images: [
          {
            url: brandingAssets.socialPreview,
            width: 1200,
            height: 630,
            alt: `${brandingMetadata.name} social preview`,
          },
        ],
      }
      : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: brandingMetadata.name,
    description: brandingMetadata.description,
    ...(brandingAssets.socialPreview
      ? { images: [brandingAssets.socialPreview] }
      : {}),
  },
  icons: {
    icon: [
      { url: "/icon-mark.svg", type: "image/svg+xml" },
      { url: brandingAssets.favicon, type: "image/x-icon" },
    ],
    shortcut: brandingAssets.favicon,
    apple: brandingAssets.appleTouchIcon,
  },
};

export const viewport: Viewport = {
  themeColor: themeColorMeta,
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
    try {
      const { head, body, lang } = await getStaticLandingDocument();
      return (
        <html
          lang={lang}
          suppressHydrationWarning
          className={fontClassName}
          {...htmlAttributeDefaults}
          data-theme={DEFAULT_THEME}
        >
          <head dangerouslySetInnerHTML={{ __html: ensureThemeAssets(head) }} />
          <body
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </html>
      );
    } catch (error) {
      console.error(
        "Failed to load static landing snapshot markup. Falling back to dynamic layout rendering.",
        error,
      );
    }
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
        <meta
          name="theme-color"
          content={`hsl(${brandingPalette.brand.base})`}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-title"
          content={brandingMetadata.name}
        />
        <link rel="apple-touch-icon" href={brandingAssets.appleTouchIcon} />
        <link rel="icon" type="image/svg+xml" href="/icon-mark.svg" />
        <link rel="icon" type="image/x-icon" href={brandingAssets.favicon} />
        <style
          id={BRANDING_STYLE_ELEMENT_ID}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: dynamicBrandingStyles }}
        />
        <script
          id={THEME_SCRIPT_ID}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: dynamicThemeScript }}
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
            <SkipToContent />
            <SiteHeader />
            <Flex
              zIndex={0}
              fillWidth
              padding="l"
              paddingBottom="24"
              horizontal="center"
              flex={1}
            >
              <Flex
                id="main-content"
                horizontal="center"
                fillWidth
                minHeight="0"
                tabIndex={-1}
              >
                <RouteGuard>{children}</RouteGuard>
              </Flex>
            </Flex>
            <SiteFooter />
            <MobileBottomNav />
          </Column>
        </Providers>
      </body>
    </html>
  );
}
