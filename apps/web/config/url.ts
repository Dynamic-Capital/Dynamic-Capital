const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

function assertAllowedProtocol(url: URL, name: string): void {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error(
      `${name} must use http or https. Received protocol: ${url.protocol}`,
    );
  }
}

export function resolveUrl(
  name: string,
  rawValue: string | undefined,
  fallback?: string,
): string {
  const candidate = rawValue ?? fallback;
  if (!candidate) {
    throw new Error(`${name} is required to resolve a URL.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    throw new Error(
      `${name} must be a valid absolute URL. Received: ${candidate}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }

  assertAllowedProtocol(parsed, name);
  return parsed.toString();
}
