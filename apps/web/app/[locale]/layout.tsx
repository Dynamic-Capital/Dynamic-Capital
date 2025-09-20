import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import messages from './messages';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config/localization';

const SUPPORTED_LOCALE_SET = new Set(SUPPORTED_LOCALES);

type LocaleParams = {
  locale: string;
};

function resolveLocale(locale: string): string {
  return SUPPORTED_LOCALE_SET.has(locale)
    ? locale
    : DEFAULT_LOCALE;
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<LocaleParams>;
}) {
  const isStaticSnapshot = globalThis?.process?.env?.['STATIC_SNAPSHOT'] === 'true';
  if (isStaticSnapshot) {
    return children;
  }

  const resolvedParams = await params;
  const locale = resolveLocale(resolvedParams.locale);
  const fallbackMessages = (messages as Record<string, any>)[DEFAULT_LOCALE] ?? {};
  const localeMessages =
    (messages as Record<string, any>)[locale] ?? fallbackMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
