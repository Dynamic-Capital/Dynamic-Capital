import type { ReactNode } from 'react';
import './globals.css';
import '../env';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { MotionThemeProvider } from '@/components/ui/motion-theme';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Providers from './providers';
import DefaultSeoClient from '@/components/DefaultSeo';
import PostHogInit from '@/components/PostHogInit';

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
          <PostHogInit />
          <DefaultSeoClient />
          <MotionThemeProvider>
            <Navbar />
            <main>{children}</main>
            <Footer />
          </MotionThemeProvider>
          <ThemeToggle />
        </Providers>
      </body>
    </html>
  );
}
