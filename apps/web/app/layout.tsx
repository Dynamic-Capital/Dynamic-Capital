import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@once-ui-system/core/css/tokens.css';
import '@once-ui-system/core/css/styles.css';
import './globals.css';
import '../env';
import Footer from '@/components/layout/Footer';
import Providers from './providers';
import Navbar from '@/components/layout/Navbar';
import { getStaticLandingDocument } from '@/lib/staticLanding';

const SITE_URL = process.env.SITE_URL || 'http://localhost:8080';

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
      <html lang={lang}>
        <head dangerouslySetInnerHTML={{ __html: head }} />
        <body
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo.png" />
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
