// supabase/functions/_shared/static.ts
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { mna, nf, ok } from "./http.ts";
import { contentType } from "mime-types";
import { extname } from "node:path";

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

function mime(p: string) {
  return contentType(extname(p)) ?? "application/octet-stream";
}

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
    const h = new Headers({
      "content-type": mime(relPath),
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
