import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dynamic Capital VIP',
  description: 'Premium trading platform with Next.js',
  openGraph: {
    title: 'Dynamic Capital VIP',
    description: 'Premium trading platform with Next.js',
    url: 'https://dynamiccapital.vip',
    type: 'website',
    images: [
      {
        url: '/favicon.ico',
        alt: 'Dynamic Capital VIP'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dynamic Capital VIP',
    description: 'Premium trading platform with Next.js',
    images: ['/favicon.ico'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
