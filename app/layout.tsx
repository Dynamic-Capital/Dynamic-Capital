import type { ReactNode } from 'react';
import './globals.css';
import '../env';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { MotionThemeProvider } from '@/components/ui/motion-theme';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SessionProvider } from 'next-auth/react';
import { DefaultSeo } from 'next-seo';
import SEO from '../next-seo.config';
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
      </head>
      <body>
        <PostHogInit />
        <SessionProvider>
          <DefaultSeo {...SEO} />
          <MotionThemeProvider>
            <Navbar />
            <main>{children}</main>
            <Footer />
          </MotionThemeProvider>
          <ThemeToggle />
        </SessionProvider>
      </body>
    </html>
  );
}
