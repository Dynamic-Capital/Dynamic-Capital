import Script from "next/script";

import { DynamicChatLanding } from "@/components/chat/DynamicChatLanding";
import { buildMetadata, createOrganizationJsonLd } from "@/lib/seo";
import { home } from "@/resources";

export const metadata = buildMetadata({
  title: home.title,
  description: home.description,
  canonicalPath: home.path,
  image: {
    url: home.image,
    alt: `${home.title} social preview`,
    width: 1200,
    height: 630,
  },
});

export default function HomePage() {
  const organizationJsonLd = createOrganizationJsonLd({
    canonicalPath: home.path,
    description: home.description,
  });

  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(organizationJsonLd)}
      </Script>
      <DynamicChatLanding />
    </>
  );
}
