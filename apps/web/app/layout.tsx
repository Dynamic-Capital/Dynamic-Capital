import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/components/dynamic-ui-system/css/tokens.css";
import "@/components/dynamic-ui-system/css/styles.css";
import "./dynamic-ui.css";
import "./globals.css";
import "@/styles/system-shell.css";
import "@/lib/env";

import classNames from "classnames";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DC_ICON_MARK_URL } from "@/config/brand-assets";

import Providers from "./providers";
import { RouteGuard, ScrollToHash } from "@/components/dynamic-portfolio";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SkipToContent } from "@/components/navigation/SkipToContent";
import { HideOnMiniApp } from "@/components/navigation/HideOnMiniApp";
import { canonicalSiteUrl, getMetadataBase } from "@/lib/seo";
import { dynamicBranding, dynamicUI } from "@/resources";
import { PageShell } from "@/components/layout/PageShell";
import { ResourceHints } from "@/components/performance/ResourceHints";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";

const SITE_URL = canonicalSiteUrl;
const THEME_SCRIPT_ID = "theme-init";
const BRANDING_STYLE_ELEMENT_ID = "dynamic-branding-tokens";

const {
  basics: basicsConfig,
  dataViz: dataVizConfig,
} = dynamicUI;
const { fonts, style } = basicsConfig;
const brandingMetadata = dynamicBranding.metadata;
const brandingAssets = dynamicBranding.assets;
const brandingTokens = dynamicBranding.tokens;
const brandingPalette = dynamicBranding.palette;
const { dataStyle } = dataVizConfig;
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
const IS_PRODUCTION = process.env.NODE_ENV === "production";

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

const resolvedMetadataBase = getMetadataBase();
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: brandingMetadata.name,
    statusBarStyle: "black-translucent",
  },
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
      { url: DC_ICON_MARK_URL, type: "image/svg+xml" },
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
        <link rel="icon" type="image/svg+xml" href={DC_ICON_MARK_URL} />
        <link rel="icon" type="image/x-icon" href={brandingAssets.favicon} />
        <ResourceHints />
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
          <div className="app-layout">
            <SkipToContent />
            <HideOnMiniApp>
              <SiteHeader />
            </HideOnMiniApp>
            <div className="app-layout__main">
              <PageShell>
                <RouteGuard>{children}</RouteGuard>
              </PageShell>
            </div>
            <HideOnMiniApp>
              <SiteFooter />
            </HideOnMiniApp>
          </div>
          <PwaInstallPrompt />
        </Providers>
        {IS_PRODUCTION ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
