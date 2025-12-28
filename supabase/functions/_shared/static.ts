// supabase/functions/_shared/static.ts
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { mna, nf, ok } from "./http.ts";

type MimeResolver = (path: string) => string | undefined;

let mimeResolverPromise: Promise<MimeResolver> | null = null;

const createResolverFromModule = (
  module: Record<string, unknown>,
): MimeResolver | null => {
  const maybeFunction = (value: unknown): value is (path: string) => unknown =>
    typeof value === "function";

  const candidate = maybeFunction(module.contentType)
    ? module.contentType
    : module.default && typeof module.default === "object"
    ? maybeFunction((module.default as Record<string, unknown>).contentType)
      ? (module.default as Record<string, unknown>).contentType
      : undefined
    : maybeFunction(module.default)
    ? module.default
    : undefined;

  if (!candidate) {
    return null;
  }

  return (path: string) => {
    const result = candidate(path);
    return typeof result === "string" ? result : undefined;
  };
};

const loadMimeResolver = async (): Promise<MimeResolver> => {
  if (mimeResolverPromise) {
    return mimeResolverPromise;
  }

  mimeResolverPromise = (async () => {
    const candidates: Array<() => Promise<MimeResolver>> = [
      async () => {
        const module = await import("mime-types") as Record<string, unknown>;
        const resolver = createResolverFromModule(module);
        if (!resolver) {
          throw new Error("mime-types module missing contentType export");
        }
        return resolver;
      },
      async () => {
        const module = await import("npm:mime-types@3.0.1") as Record<
          string,
          unknown
        >;
        const resolver = createResolverFromModule(module);
        if (!resolver) {
          throw new Error("npm:mime-types module missing contentType export");
        }
        return resolver;
      },
    ];

    for (const candidate of candidates) {
      try {
        return await candidate();
      } catch (error) {
        console.warn(
          "[static] Failed to load mime-types module, falling back",
          error,
        );
      }
    }

    const { lookup } = await import(
      "https://deno.land/std@0.224.0/media_types/mod.ts"
    );

    return (path: string) => lookup(path) ?? undefined;
  })();

  return mimeResolverPromise;
};

const resolveMimeType = async (path: string) => {
  try {
    const resolver = await loadMimeResolver();
    return resolver(path) ?? "application/octet-stream";
  } catch (error) {
    console.error("[static] Falling back to default mime type", error);
    return "application/octet-stream";
  }
};

async function mime(path: string) {
  return await resolveMimeType(path);
}

export type StaticOpts = {
  rootDir: URL; // e.g., new URL("../miniapp/static/", import.meta.url)
  spaRoots?: string[]; // paths that should serve index.html
  security?: Record<string, string>;
  extraFiles?: string[]; // e.g., ["/favicon.svg", "/site.webmanifest", "/sitemap.xml"]
};
export const DEFAULT_SECURITY = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "permissions-policy": "geolocation=(), microphone=(), camera=()",
  "content-security-policy":
    "default-src 'self' https://*.telegram.org https://telegram.org; " +
    "script-src 'self' 'unsafe-inline' https://*.telegram.org; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.functions.supabase.co https://*.supabase.co wss://*.supabase.co; " +
    "font-src 'self' data:; " +
    "frame-ancestors 'self';",
} as const;

async function readFileFrom(
  rootDir: URL,
  relPath: string,
): Promise<Response | null> {
  try {
    const rel = relPath.replace(/^\/+/, "");
    const url = new URL(`./${rel}`, rootDir);
    if (!url.pathname.startsWith(rootDir.pathname)) return null; // prevent path traversal

    console.log(`[static] Attempting to read file: ${url.pathname}`);
    const data = await Deno.readFile
      ? await Deno.readFile(url)
      : await (await import("node:fs/promises")).readFile(url);
    const explicitMime = relPath.endsWith(".xml")
      ? "application/xml"
      : relPath.endsWith(".txt")
      ? "text/plain; charset=utf-8"
      : null;
    const h = new Headers({
      "content-type": explicitMime ?? await mime(relPath),
      "cache-control": relPath.endsWith(".html")
        ? "no-cache"
        : "public, max-age=31536000, immutable",
    });
    console.log(
      `[static] Successfully read file: ${url.pathname}, size: ${data.length}`,
    );
    return new Response(data, { headers: h });
  } catch (e) {
    console.error(`[static] Failed to read file: ${relPath}`, e);
    return null;
  }
}

export async function serveStatic(
  req: Request,
  opts: StaticOpts,
): Promise<Response> {
  const url = new URL(req.url);
  // Normalize Supabase's default /functions/v1 prefix so the same handler
  // works whether the function is invoked at /miniapp or /functions/v1/miniapp.
  url.pathname = url.pathname.replace(/^\/functions\/v1/, "");
  const path = url.pathname.replace(/\/+$/, ""); // strip trailing slash for routing
  const sec = { ...DEFAULT_SECURITY, ...(opts.security || {}) };
  const spaRoots = (opts.spaRoots ?? ["/"]).map((r) => r.replace(/\/+$/, ""));

  console.log(`[static] Request: ${req.method} ${url.pathname}`);

  const setSec = (resp: Response) => {
    const h = new Headers(resp.headers);
    for (const [k, v] of Object.entries(sec)) h.set(k, v);
    return new Response(resp.body, { headers: h, status: resp.status });
  };

  const extra = new Set(
    opts.extraFiles ?? [
      "/favicon.svg",
      "/favicon.ico",
      "/site.webmanifest",
      "/robots.txt",
      "/sitemap.xml",
    ],
  );

  // HEAD allowed on SPA roots
  if (req.method === "HEAD") {
    if (spaRoots.includes(path)) {
      return setSec(new Response(null, { status: 200 }));
    }
    if (url.pathname.endsWith("/version")) {
      const h = new Headers({
        "content-type": "application/json; charset=utf-8",
      });
      for (const [k, v] of Object.entries(sec)) h.set(k, v);
      return new Response(null, { headers: h, status: 200 });
    }
    if (extra.has(url.pathname) || url.pathname.startsWith("/assets/")) {
      const f = await readFileFrom(opts.rootDir, url.pathname);
      if (f) {
        const h = new Headers(f.headers);
        return setSec(new Response(null, { headers: h, status: f.status }));
      }
      return setSec(new Response(null, { status: 404 }));
    }
    return setSec(new Response(null, { status: 404 }));
  }

  if (req.method !== "GET") return mna();

  // Allow GET /version
  if (url.pathname.endsWith("/version")) {
    const r = ok({ name: "miniapp", ts: new Date().toISOString() });
    const h = new Headers(r.headers);
    for (const [k, v] of Object.entries(sec)) h.set(k, v);
    return new Response(await r.arrayBuffer(), {
      headers: h,
      status: r.status,
    });
  }

  // Serve explicitly allowed root files first (e.g., robots.txt, sitemap.xml)
  if (extra.has(url.pathname)) {
    const f = await readFileFrom(opts.rootDir, url.pathname);
    return f ? setSec(f) : nf("Not Found");
  }

  // Serve /assets/* before falling back to SPA handling
  if (url.pathname.startsWith("/assets/")) {
    const f = await readFileFrom(opts.rootDir, url.pathname);
    return f ? setSec(f) : nf("Not Found");
  }

  // Serve SPA index for configured roots and their subpaths
  const normPath = path === "" ? "/" : path;
  if (
    spaRoots.some((root) =>
      normPath === root || normPath.startsWith((root ? root : "") + "/")
    )
  ) {
    console.log(`[static] Serving index.html for SPA root: ${url.pathname}`);
    const idx = await readFileFrom(opts.rootDir, "index.html");
    if (idx) {
      const h = new Headers(idx.headers);
      for (const [k, v] of Object.entries(sec)) h.set(k, v);
      return new Response(idx.body, { headers: h, status: idx.status });
    }
    console.error(
      `[static] index.html not found in rootDir: ${opts.rootDir.pathname}`,
    );
    return nf("index.html missing");
  }

  // Unknown path → 404
  console.log(`[static] Path not found: ${url.pathname}`);
  const notFound = await readFileFrom(opts.rootDir, "404.html");
  if (notFound) {
    const h = new Headers(notFound.headers);
    for (const [k, v] of Object.entries(sec)) h.set(k, v);
    return new Response(notFound.body, { headers: h, status: 404 });
  }
  return nf("Not Found");
}
