import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import messages from './messages';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeMessages = (messages as Record<string, any>)[locale] || messages.en;
  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
