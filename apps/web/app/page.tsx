import { DynamicChatLanding } from "@/components/chat/DynamicChatLanding";
import { Schema } from "@/components/dynamic-ui-system";
import { buildMetadata, buildOrganizationSchema } from "@/lib/seo";
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
  const organizationSchema = buildOrganizationSchema({
    canonicalPath: home.path,
    description: home.description,
  });

  return (
    <>
      <Schema {...organizationSchema} />
      <DynamicChatLanding />
    </>
  );
}
