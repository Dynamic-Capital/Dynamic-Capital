const DEFAULT_SUPABASE_URL = "https://qeejuomcapbdlhnjqjcc.supabase.co";
const DYNAMIC_PORTFOLIO_BUCKET = "dynamic-portfolio";

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

function resolveSupabaseUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
    DEFAULT_SUPABASE_URL,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const url = new URL(trimmed);
      return url.origin;
    } catch {
      // ignore invalid URLs and continue checking the next candidate
    }
  }

  return DEFAULT_SUPABASE_URL;
}

const SUPABASE_URL = resolveSupabaseUrl();

function buildBucketBase(): string {
  try {
    const bucketUrl = new URL(
      `/storage/v1/object/public/${DYNAMIC_PORTFOLIO_BUCKET}/`,
      SUPABASE_URL,
    );
    return bucketUrl.toString();
  } catch {
    return `${DEFAULT_SUPABASE_URL}/storage/v1/object/public/${DYNAMIC_PORTFOLIO_BUCKET}/`;
  }
}

const SUPABASE_BUCKET_BASE = buildBucketBase();

export function supabaseAsset(path: string): string {
  if (typeof path !== "string" || path.trim().length === 0) {
    return SUPABASE_BUCKET_BASE;
  }

  const normalizedPath = path.replace(/^\/+/, "");
  return `${SUPABASE_BUCKET_BASE}${normalizedPath}`;
}

export function toAbsoluteUrl(
  baseUrl: string | undefined,
  candidate: string,
): string {
  if (!candidate) {
    return candidate;
  }

  if (ABSOLUTE_URL_PATTERN.test(candidate)) {
    return candidate;
  }

  if (!baseUrl) {
    return candidate;
  }

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    try {
      return new URL(candidate, `${baseUrl.replace(/\/$/, "")}/`).toString();
    } catch {
      return candidate;
    }
  }
}

export const dynamicPortfolioBucketBaseUrl = SUPABASE_BUCKET_BASE;
export const dynamicPortfolioBucketName = DYNAMIC_PORTFOLIO_BUCKET;
