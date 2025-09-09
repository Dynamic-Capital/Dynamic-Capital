import type { ReactNode } from 'react';
import './globals.css';
import { cookies } from 'next/headers';
import CookieConsent from '@/components/CookieConsent';

export const metadata = {
  title: 'Dynamic Capital VIP',
  description: 'Premium trading platform with Next.js'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const theme = cookies().get('theme')?.value;
  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : ''}>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
