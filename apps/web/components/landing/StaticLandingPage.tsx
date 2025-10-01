import { LandingPageShell } from "@/components/landing/LandingPageShell";
import { getStaticLandingDocument } from "@/lib/staticLanding";

export async function StaticLandingPage() {
  try {
    const { body } = await getStaticLandingDocument();

    return (
      <div
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  } catch (error) {
    console.error(
      "Failed to load static landing snapshot. Rendering dynamic shell instead.",
      error,
    );

    return <LandingPageShell chromaBackgroundVariant="liquid" />;
  }
}
