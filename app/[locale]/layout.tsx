import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, ReactElement } from 'react';
import { notFound } from 'next/navigation';
import messages from './messages';

function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale?: string };
}) {
  const locale = params?.locale ?? 'en';
  if (!(messages as Record<string, any>)[locale]) {
    notFound();
  }
  const localeMessages = (messages as Record<string, any>)[locale];
  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

export default LocaleLayout as unknown as (props: {
  children: ReactNode;
  params: Promise<{ locale?: string }>;
}) => ReactElement;

export function generateStaticParams() {
  return Object.keys(messages).map((locale) => ({ locale }));
}
