import type { Metadata } from "next";
import type { SchemaProps } from "@/components/dynamic-ui-system/internal/modules/seo/Schema";

import { dynamicBranding, sameAs, toAbsoluteUrl } from "@/resources";

const FALLBACK_SITE_URL = normalizeSiteUrl(
  dynamicBranding.metadata.primaryUrl,
  { ensureTrailingSlash: true },
) ?? "https://dynamic.capital/";
const SITE_URL = normalizeSiteUrl(
  process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  { ensureTrailingSlash: true },
) ?? FALLBACK_SITE_URL;
const METADATA_BASE = resolveMetadataBase(SITE_URL);

export const canonicalSiteUrl = SITE_URL;

export function getMetadataBase(): URL | undefined {
  return METADATA_BASE;
}

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

type OrganizationSchemaOptions = {
  canonicalPath?: string;
  canonicalUrl?: string;
  sameAs?: Iterable<string>;
  description?: string;
  image?: string;
  title?: string;
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
  const openGraph = {
    type: options.type ?? "website",
    siteName: brandMetadata.name,
    title,
    description,
    ...(canonical ? { url: canonical } : {}),
    ...(ogImage ? { images: ogImage } : {}),
  } satisfies Metadata["openGraph"];
  const twitter = {
    card: "summary_large_image" as const,
    title,
    description,
    ...(ogImage ? { images: ogImage.map((image) => image.url) } : {}),
  } satisfies Metadata["twitter"];

  return {
    metadataBase: METADATA_BASE,
    title,
    description,
    keywords,
    alternates: canonical ? { canonical } : undefined,
    openGraph,
    twitter,
    robots,
  } satisfies Metadata;
}

export function buildOrganizationSchema(
  options: OrganizationSchemaOptions = {},
): SchemaProps {
  const { metadata: brandMetadata, assets } = dynamicBranding;
  const { baseURL, path } = resolveSchemaLocation(
    options.canonicalUrl,
    options.canonicalPath,
  );
  const sameAsLinks = uniqueStrings(
    options.sameAs ?? Object.values(sameAs ?? {}),
  ).filter(isValidUrl);
  const image = resolveSchemaImage(
    options.image,
    assets.logo,
    assets.socialPreview,
  );

  return {
    as: "organization",
    title: options.title ?? brandMetadata.name,
    description: options.description ?? brandMetadata.description,
    baseURL,
    path,
    ...(image ? { image } : {}),
    ...(sameAsLinks.length > 0 ? { sameAs: sameAsLinks } : {}),
  } satisfies SchemaProps;
}

export function resolveCanonicalUrl(
  pathOrUrl: string | undefined,
): string | undefined {
  if (!pathOrUrl) {
    return undefined;
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

function resolveSchemaImage(
  image: string | undefined,
  logo: string | undefined,
  fallback: string | undefined,
): string | undefined {
  const candidate = image ?? logo ?? fallback;

  if (!candidate) {
    return undefined;
  }

  return toAbsoluteUrl(SITE_URL, candidate);
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

function resolveSchemaLocation(
  canonicalUrl: string | undefined,
  canonicalPath: string | undefined,
): { baseURL: string; path: string } {
  const resolved = resolveCanonicalUrl(canonicalUrl ?? canonicalPath);

  if (resolved) {
    try {
      const parsed = new URL(resolved);
      const pathname = parsed.pathname || "/";
      const search = parsed.search ?? "";
      const hash = parsed.hash ?? "";

      return {
        baseURL: `${parsed.origin}/`,
        path: `${pathname}${search}${hash}` || "/",
      };
    } catch {
      // fall through to defaults
    }
  }

  const normalizedPath = normalizePath(canonicalPath);

  return {
    baseURL: SITE_URL,
    path: normalizedPath,
  };
}

function normalizePath(path: string | undefined): string {
  if (!path || path === "/") {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
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

function resolveMetadataBase(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}
