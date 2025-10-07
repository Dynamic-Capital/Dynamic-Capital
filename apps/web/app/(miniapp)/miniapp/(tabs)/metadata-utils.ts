import type { Metadata } from "next";

export interface MiniAppMetadataConfig {
  title: string;
  description: string;
  image: {
    url: string;
    alt: string;
  };
}

export function createMiniAppMetadata(
  { title, description, image }: MiniAppMetadataConfig,
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image.url,
          width: 512,
          height: 512,
          alt: image.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
    icons: {
      icon: image.url,
    },
  };
}
