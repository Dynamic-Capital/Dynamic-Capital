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

const onceThemeScript = `(function () {
  try {
    const root = document.documentElement;
    const defaultTheme = 'system';

    const resolveTheme = (themeValue) => {
      if (!themeValue || themeValue === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return themeValue;
    };

    const setInitialAttribute = (key, value) => {
      if (!root.hasAttribute(key)) {
        root.setAttribute(key, value);
      }
    };

    setInitialAttribute('data-neutral', 'gray');
    setInitialAttribute('data-brand', 'red');
    setInitialAttribute('data-accent', 'magenta');
    setInitialAttribute('data-solid', 'contrast');
    setInitialAttribute('data-solid-style', 'flat');
    setInitialAttribute('data-border', 'playful');
    setInitialAttribute('data-surface', 'filled');
    setInitialAttribute('data-transition', 'all');
    setInitialAttribute('data-scaling', '100');
    setInitialAttribute('data-viz-style', 'categorical');

    const storedTheme = localStorage.getItem('data-theme') || defaultTheme;
    const resolvedTheme = resolveTheme(storedTheme);
    root.setAttribute('data-theme', resolvedTheme);

    const styleKeys = ['neutral', 'brand', 'accent', 'solid', 'solid-style', 'border', 'surface', 'transition', 'scaling', 'viz-style'];
    styleKeys.forEach((key) => {
      const storedValue = localStorage.getItem('data-' + key);
      if (storedValue) {
        root.setAttribute('data-' + key, storedValue);
      }
    });
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Dynamic Capital',
    template: '%s | Dynamic Capital',
  },
  description: 'Premium trading platform with Next.js',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
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
        data-neutral="gray"
        data-brand="red"
        data-accent="magenta"
        data-solid="contrast"
        data-solid-style="flat"
        data-border="playful"
        data-surface="filled"
        data-transition="all"
        data-scaling="100"
        data-viz-style="categorical"
        data-theme="dark"
      >
        <head dangerouslySetInnerHTML={{ __html: head }} />
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
      data-neutral="gray"
      data-brand="red"
      data-accent="magenta"
      data-solid="contrast"
      data-solid-style="flat"
      data-border="playful"
      data-surface="filled"
      data-transition="all"
      data-scaling="100"
      data-viz-style="categorical"
      data-theme="dark"
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo.png" />
        <script
          id="once-ui-theme"
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
