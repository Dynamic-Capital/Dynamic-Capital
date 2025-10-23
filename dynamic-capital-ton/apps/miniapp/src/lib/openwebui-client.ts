const PUBLIC_URL = process.env.NEXT_PUBLIC_OPEN_WEBUI_URL ?? null;
const INTERNAL_URL =
  process.env.OPEN_WEBUI_INTERNAL_URL ?? process.env.NEXT_PUBLIC_OPEN_WEBUI_URL ??
    null;
const DEFAULT_HEALTH_PATH = process.env.OPEN_WEBUI_HEALTH_PATH ?? "/health";
const CACHE_WINDOW_MS = 30_000;

type AvailabilityCache = {
  promise: Promise<void> | null;
  expiresAt: number;
};

let availabilityCache: AvailabilityCache | null = null;

function normalisePath(pathname: string): string {
  if (!pathname) return "";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function ensureTrailingSlash(input: string): string {
  return input.endsWith("/") ? input : `${input}/`;
}

function normalisePublicPath(rawUrl: string | null): {
  path: string;
  query: string;
  hash: string;
} | null {
  if (!rawUrl) {
    return null;
  }
  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    const suffix = pathname ? `${pathname}` : "";
    return {
      path: `/openwebui${suffix}` || "/openwebui",
      query: parsed.search ?? "",
      hash: parsed.hash ?? "",
    };
  } catch (error) {
    console.warn("[miniapp] Failed to normalise Open WebUI public URL:", error);
    return null;
  }
}

function normaliseInternalBase(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (!/https?:/.test(parsed.protocol)) {
      console.warn(
        `[miniapp] Ignoring Open WebUI internal URL with unsupported protocol: ${rawUrl}`,
      );
      return null;
    }
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${pathname}`;
  } catch (error) {
    console.warn("[miniapp] Failed to parse Open WebUI internal URL:", error);
    return null;
  }
}

const proxiedEmbedParts = normalisePublicPath(PUBLIC_URL);
const internalBase = normaliseInternalBase(INTERNAL_URL);

function buildHealthCandidates(): string[] {
  const paths = Array.from(new Set([
    DEFAULT_HEALTH_PATH,
    "/healthz",
    "/health-check",
    "/",
  ])).map(normalisePath);

  const candidates: string[] = [];

  if (typeof window !== "undefined" && proxiedEmbedParts) {
    for (const path of paths) {
      const base = ensureTrailingSlash(proxiedEmbedParts.path);
      const suffix = path === "/" ? "" : path.replace(/^\//, "");
      candidates.push(`${base}${suffix}`);
    }
  }

  if (internalBase) {
    for (const path of paths) {
      const suffix = path === "/" ? "" : path;
      candidates.push(`${internalBase}${suffix}`);
    }
  }

  return candidates;
}

async function probeUrl(url: string, signal?: AbortSignal): Promise<boolean> {
  const methods: RequestInit["method"][] = ["HEAD", "GET"];
  for (const method of methods) {
    try {
      const response = await fetch(url, {
        method,
        signal,
        cache: "no-store",
      });
      if (response.ok) {
        return true;
      }
      if (response.status >= 500) {
        return false;
      }
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        throw error;
      }
    }
  }
  return false;
}

async function checkAvailability(signal?: AbortSignal): Promise<void> {
  const candidates = buildHealthCandidates();
  if (!candidates.length) {
    throw new Error(
      "Open WebUI URL not configured. Set NEXT_PUBLIC_OPEN_WEBUI_URL and OPEN_WEBUI_INTERNAL_URL.",
    );
  }

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const ok = await probeUrl(candidate, signal);
      if (ok) {
        return;
      }
      lastError = new Error(
        `Open WebUI responded with a non-OK status at ${candidate}.`,
      );
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to reach Open WebUI availability endpoint");
}

export async function ensureOpenWebUIAvailable(options: {
  signal?: AbortSignal;
  force?: boolean;
} = {}): Promise<void> {
  const now = Date.now();
  if (
    !options.force &&
    availabilityCache &&
    availabilityCache.promise &&
    availabilityCache.expiresAt > now
  ) {
    return availabilityCache.promise;
  }

  const promise = checkAvailability(options.signal).then(() => {
    availabilityCache = {
      promise: Promise.resolve(),
      expiresAt: Date.now() + CACHE_WINDOW_MS,
    };
  }).catch((error) => {
    if (availabilityCache?.promise === promise) {
      availabilityCache = null;
    }
    throw error;
  });

  availabilityCache = {
    promise,
    expiresAt: now + CACHE_WINDOW_MS,
  };

  return promise;
}

export function getOpenWebUIEmbedUrl(): string | null {
  if (!PUBLIC_URL) {
    return null;
  }
  if (proxiedEmbedParts) {
    const base = ensureTrailingSlash(proxiedEmbedParts.path);
    return `${base}${proxiedEmbedParts.query ?? ""}${proxiedEmbedParts.hash ?? ""}`;
  }
  try {
    const parsed = new URL(PUBLIC_URL);
    parsed.pathname = ensureTrailingSlash(parsed.pathname.replace(/\/+$/, ""));
    return parsed.toString();
  } catch (error) {
    console.warn("[miniapp] Failed to build Open WebUI embed URL:", error);
    return null;
  }
}

export function getOpenWebUIOrigins(): {
  publicUrl: string | null;
  internalUrl: string | null;
} {
  return {
    publicUrl: PUBLIC_URL,
    internalUrl: INTERNAL_URL,
  };
}
