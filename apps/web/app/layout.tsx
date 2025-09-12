import type { ReactNode } from 'react';
import './globals.css';
import '../env';
import Footer from '@/components/layout/Footer';
import Providers from './providers';

export const metadata = {
  title: 'Dynamic Capital VIP',
  description: 'Premium trading platform with Next.js'
};

export default function RootLayout({ children }: { children: ReactNode }) {
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
          {/* Navbar removed to avoid build-time hook issues */}
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
