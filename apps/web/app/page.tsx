import { LandingPageShell } from "@/components/landing/LandingPageShell";
import { StaticLandingPage } from "@/components/landing/StaticLandingPage";

export default function HomePage() {
  const isStaticSnapshot =
    globalThis?.process?.env?.["STATIC_SNAPSHOT"] === "true";

  if (isStaticSnapshot) {
    return <StaticLandingPage />;
  }

  return <LandingPageShell chromaBackgroundVariant="liquid" />;
}
