import { LandingPageShell } from "@/components/landing/LandingPageShell";
import {
  ensureStaticSnapshotVisibilityMarkup,
  getStaticLandingDocument,
} from "@/lib/staticLanding";

export async function StaticLandingPage() {
  try {
    const { body } = await getStaticLandingDocument();
    const enhancedBody = ensureStaticSnapshotVisibilityMarkup(body, {
      position: "prepend",
    });

    return (
      <div
        data-static-snapshot="true"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: enhancedBody }}
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
