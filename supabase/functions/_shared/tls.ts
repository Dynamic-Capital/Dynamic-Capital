export type HttpClientContext = {
  client: Deno.HttpClient;
  description: string;
};

const INLINE_CERT_ENV_KEYS = [
  "TELEGRAM_CA_CERT_DATA",
  "TELEGRAM_CA_BUNDLE_DATA",
  "EXTRA_CA_CERT_DATA",
];

const PATH_CERT_ENV_KEYS = [
  "TELEGRAM_CA_CERT",
  "TELEGRAM_CA_BUNDLE",
  "EXTRA_CA_CERT",
  "SSL_CERT_FILE",
];

const DEFAULT_CERT_PATHS = [
  "/etc/ssl/certs/ca-certificates.crt",
  "/etc/ssl/cert.pem",
  "/usr/local/share/certs/ca-root-nss.crt",
];

const HTTPS_PROXY_ENV_KEYS = [
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
];

const TLS_STORE_TARGET = "system,mozilla";

function expandPathList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(":").map((segment) => segment.trim()).filter(Boolean);
}

async function collectCertificateBundles(): Promise<
  Array<{ data: string; description: string }>
> {
  const segments: Array<{ data: string; description: string }> = [];

  for (const key of INLINE_CERT_ENV_KEYS) {
    const value = Deno.env.get(key);
    if (value && value.trim()) {
      segments.push({
        data: value,
        description: `inline certificate from ${key}`,
      });
    }
  }

  const seenPaths = new Set<string>();
  for (const key of PATH_CERT_ENV_KEYS) {
    const rawValue = Deno.env.get(key);
    for (const path of expandPathList(rawValue)) {
      if (seenPaths.has(path)) continue;
      seenPaths.add(path);
      try {
        const info = await Deno.stat(path);
        if (!info.isFile) {
          continue;
        }
        const data = await Deno.readTextFile(path);
        segments.push({
          data,
          description: `certificate bundle from ${key} (${path})`,
        });
      } catch (error) {
        if (rawValue) {
          console.warn(
            `[tls] Unable to read certificate bundle from ${path}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }
  }

  for (const path of DEFAULT_CERT_PATHS) {
    if (seenPaths.has(path)) continue;
    try {
      const info = await Deno.stat(path);
      if (!info.isFile) {
        continue;
      }
      const data = await Deno.readTextFile(path);
      segments.push({
        data,
        description: `system certificate bundle (${path})`,
      });
    } catch {
      // Ignore missing defaults; they vary between runtimes.
    }
  }

  return segments;
}

function ensureTlsStore(): string | null {
  const existing = Deno.env.get("DENO_TLS_CA_STORE");
  if (!existing || !existing.trim()) {
    Deno.env.set("DENO_TLS_CA_STORE", TLS_STORE_TARGET);
    return TLS_STORE_TARGET;
  }
  const normalized = existing.split(",").map((entry) => entry.trim()).filter(
    Boolean,
  );
  let changed = false;
  if (!normalized.includes("system")) {
    normalized.push("system");
    changed = true;
  }
  if (!normalized.includes("mozilla")) {
    normalized.push("mozilla");
    changed = true;
  }
  if (changed) {
    const updated = normalized.join(",");
    Deno.env.set("DENO_TLS_CA_STORE", updated);
    return updated;
  }
  return existing;
}

function resolveProxy(): { url: string; description: string } | null {
  for (const key of HTTPS_PROXY_ENV_KEYS) {
    const value = Deno.env.get(key);
    if (value && value.trim()) {
      return {
        url: value.trim(),
        description: `${key}=${value.trim()}`,
      };
    }
  }
  return null;
}

export async function createHttpClientWithEnvCa(): Promise<
  HttpClientContext | null
> {
  const bundles = await collectCertificateBundles();
  const proxy = resolveProxy();
  const tlsStore = ensureTlsStore();

  if (bundles.length === 0 && !proxy && !tlsStore) {
    return null;
  }

  const combined = bundles.length
    ? `${bundles.map((segment) => segment.data).join("\n")}\n`
    : undefined;

  const client = Deno.createHttpClient({
    caData: combined,
    proxy: proxy ? { url: proxy.url } : undefined,
  });

  const description = [
    bundles.map((segment) => segment.description).join(", ") || null,
    tlsStore ? `DENO_TLS_CA_STORE=${tlsStore}` : null,
    proxy?.description ?? null,
  ].filter(Boolean).join(", ");

  return {
    client,
    description,
  };
}
