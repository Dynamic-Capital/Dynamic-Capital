import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@once-ui-system/core/css/tokens.css';
import '@once-ui-system/core/css/styles.css';
import './once-ui.css';
import './globals.css';
import '../env';
import Footer from '@/components/layout/Footer';
import Providers from './providers';
import Navbar from '@/components/layout/Navbar';
import { getStaticLandingDocument } from '@/lib/staticLanding';

const SITE_URL = process.env.SITE_URL || 'http://localhost:8080';
const DEFAULT_THEME = 'dark' as const;
const THEME_ATTRIBUTE_PREFIX = 'data-' as const;
const THEME_STORAGE_KEY = `${THEME_ATTRIBUTE_PREFIX}theme` as const;
const ONCE_THEME_DATA_ATTRIBUTES = {
  'data-neutral': 'gray',
  'data-brand': 'red',
  'data-accent': 'magenta',
  'data-solid': 'contrast',
  'data-solid-style': 'flat',
  'data-border': 'playful',
  'data-surface': 'filled',
  'data-transition': 'all',
  'data-scaling': '100',
  'data-viz-style': 'categorical',
} as const satisfies Record<string, string>;

const ONCE_THEME_SCRIPT_ID = 'once-ui-theme';
const serializedAttributeDefaults = JSON.stringify(ONCE_THEME_DATA_ATTRIBUTES);
const serializedStyleKeys = JSON.stringify(
  Object.keys(ONCE_THEME_DATA_ATTRIBUTES).map((attribute) =>
    attribute.replace(THEME_ATTRIBUTE_PREFIX, ''),
  ),
);

const onceThemeScript = `(function () {
  try {
    var root = document.documentElement;
    var defaultThemeSetting = 'system';
    var attributeDefaults = ${serializedAttributeDefaults};

    Object.entries(attributeDefaults).forEach(function ([attribute, value]) {
      if (!root.hasAttribute(attribute)) {
        root.setAttribute(attribute, value);
      }
    });

    var resolveTheme = function (themeValue) {
      if (!themeValue || themeValue === defaultThemeSetting) {
        var supportsMatchMedia = typeof window.matchMedia === 'function';
        if (supportsMatchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
        return 'light';
      }
      return themeValue;
    };

    var storedTheme = localStorage.getItem('${THEME_STORAGE_KEY}') || defaultThemeSetting;
    var resolvedTheme = resolveTheme(storedTheme);
    root.setAttribute('${THEME_STORAGE_KEY}', resolvedTheme);

    var styleKeys = ${serializedStyleKeys};
    styleKeys.forEach(function (key) {
      var storageKey = '${THEME_ATTRIBUTE_PREFIX}' + key;
      var storedValue = localStorage.getItem(storageKey);
      if (storedValue) {
        root.setAttribute(storageKey, storedValue);
      }
    });
  } catch (error) {
    document.documentElement.setAttribute('${THEME_STORAGE_KEY}', '${DEFAULT_THEME}');
  }
})();`;
const onceThemeScriptTag = `<script id="${ONCE_THEME_SCRIPT_ID}">${onceThemeScript}</script>`;

function ensureOnceThemeScript(markup: string): string {
  if (!markup) {
    return onceThemeScriptTag;
  }

  if (markup.includes(`id="${ONCE_THEME_SCRIPT_ID}"`)) {
    return markup;
  }

  return `${markup}\n${onceThemeScriptTag}`;
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
    default: 'Dynamic Capital',
    template: '%s | Dynamic Capital',
  },
  description: 'Premium trading platform with Next.js',
  alternates: {
    canonical: resolvedMetadataBase?.toString() ?? SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: resolvedMetadataBase?.toString() ?? SITE_URL,
    siteName: 'Dynamic Capital',
    title: 'Dynamic Capital',
    description: 'Premium trading platform with Next.js',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dynamic Capital',
    description: 'Premium trading platform with Next.js',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const isStaticSnapshot = globalThis?.process?.env?.['STATIC_SNAPSHOT'] === 'true';

  if (isStaticSnapshot) {
    const { head, body, lang } = await getStaticLandingDocument();
    return (
      <html
        lang={lang}
        suppressHydrationWarning
        {...ONCE_THEME_DATA_ATTRIBUTES}
        data-theme={DEFAULT_THEME}
      >
        <head dangerouslySetInnerHTML={{ __html: ensureOnceThemeScript(head) }} />
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
      {...ONCE_THEME_DATA_ATTRIBUTES}
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
          id={ONCE_THEME_SCRIPT_ID}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: onceThemeScript }}
        />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
