import { getStaticLandingDocument } from '@/lib/staticLanding';

export async function StaticLandingPage() {
  const { body } = await getStaticLandingDocument();

  return (
    <div
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
