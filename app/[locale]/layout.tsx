import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import messages from './messages';

export default function LocaleLayout({ children, params }: { children: ReactNode; params: { locale: string } }) {
  const locale = params.locale;
  const localeMessages = (messages as Record<string, any>)[locale] || messages.en;
  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
