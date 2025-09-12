import HomePage from '../page';
import messages from './messages';
import { ReactElement } from 'react';

function LocalePage({ params }: { params: { locale?: string } }) {
  const locale = params.locale ?? 'en';
  const greeting = (messages as Record<string, any>)[locale]?.greeting || messages.en.greeting;
  return (
    <>
      <p className="text-center mb-4">{greeting}</p>
      <HomePage />
    </>
  );
}

export default LocalePage as unknown as (props: {
  params: Promise<{ locale?: string }>;
}) => ReactElement;

