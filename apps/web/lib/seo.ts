import type { Metadata } from "next";

import { dynamicBranding, sameAs, toAbsoluteUrl } from "@/resources";

const FALLBACK_SITE_URL = dynamicBranding.metadata.primaryUrl ??
  "https://dynamic.capital";
const SITE_URL =
  normalizeSiteUrl(process.env.SITE_URL, { ensureTrailingSlash: true }) ??
    FALLBACK_SITE_URL;

type MetadataImageInput = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
};

type OgImageInput = string | MetadataImageInput;

type BuildMetadataOptions = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  canonicalUrl?: string;
  keywords?: string[];
  image?: OgImageInput;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  noFollow?: boolean;
};

type OrganizationJsonLdOptions = {
  canonicalPath?: string;
  canonicalUrl?: string;
  sameAs?: Iterable<string>;
  description?: string;
};

export function buildMetadata(options: BuildMetadataOptions = {}): Metadata {
  const { metadata: brandMetadata, assets } = dynamicBranding;
  const title = options.title ?? brandMetadata.name;
  const description = options.description ?? brandMetadata.description;
  const canonical = resolveCanonicalUrl(
    options.canonicalUrl ?? options.canonicalPath,
  );
  const keywords = uniqueStrings(options.keywords ?? brandMetadata.keywords);
  const ogImage = resolveOgImage(options.image, assets.socialPreview, title);
  const robots = buildRobotsConfig(options.noIndex, options.noFollow);

  return {
    title,
    description,
    keywords,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: options.type ?? "website",
      url: canonical,
      siteName: brandMetadata.name,
      title,
      description,
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage?.map((image) => image.url),
    },
    robots,
  } satisfies Metadata;
}

export function createOrganizationJsonLd(
  options: OrganizationJsonLdOptions = {},
) {
  const { metadata: brandMetadata, assets } = dynamicBranding;
  const canonical = resolveCanonicalUrl(
    options.canonicalUrl ?? options.canonicalPath,
  );
  const logoUrl = assets.logo
    ? toAbsoluteUrl(SITE_URL, assets.logo)
    : undefined;
  const sameAsLinks = uniqueStrings(
    options.sameAs ?? Object.values(sameAs ?? {}),
  ).filter(isValidUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brandMetadata.name,
    url: canonical ?? SITE_URL,
    description: options.description ?? brandMetadata.description,
    email: brandMetadata.supportEmail,
    logo: logoUrl,
    sameAs: sameAsLinks,
  } as const;
}

export function resolveCanonicalUrl(
  pathOrUrl: string | undefined,
): string | undefined {
  if (!pathOrUrl) {
    return SITE_URL;
  }

  if (isValidUrl(pathOrUrl)) {
    return normalizeSiteUrl(pathOrUrl);
  }

  return toAbsoluteUrl(SITE_URL, pathOrUrl);
}

function normalizeSiteUrl(
  candidate: string | undefined,
  options: { ensureTrailingSlash?: boolean } = {},
): string | undefined {
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    const serialized = url.toString();

    if (!options.ensureTrailingSlash) {
      return serialized;
    }

    return serialized.replace(/\/?$/, "/");
  } catch {
    return undefined;
  }
}

function uniqueStrings(values: Iterable<string> | undefined): string[] {
  if (!values) return [];

  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    seen.add(normalized);
  }

  return [...seen];
}

function resolveOgImage(
  input: OgImageInput | undefined,
  fallback: string | undefined,
  title: string,
): MetadataImageInput[] | undefined {
  const images: MetadataImageInput[] = [];

  if (typeof input === "string") {
    images.push({
      url: toAbsoluteUrl(SITE_URL, input),
      alt: `${title} social preview`,
    });
  } else if (input) {
    images.push({
      ...input,
      url: toAbsoluteUrl(SITE_URL, input.url),
    });
  }

  if (!images.length && fallback) {
    images.push({
      url: toAbsoluteUrl(SITE_URL, fallback),
      alt: `${title} social preview`,
      width: 1200,
      height: 630,
    });
  }

  return images.length > 0 ? images : undefined;
}

function buildRobotsConfig(
  noIndex: boolean | undefined,
  noFollow: boolean | undefined,
) {
  if (!noIndex && !noFollow) {
    return undefined;
  }

  return {
    index: !noIndex,
    follow: !noFollow,
    googleBot: {
      index: !noIndex,
      follow: !noFollow,
    },
  };
}

function isValidUrl(candidate: string | undefined): candidate is string {
  if (!candidate) return false;

  try {
    const url = new URL(candidate);
    return Boolean(url.protocol && url.host);
  } catch {
    return false;
  }
}
