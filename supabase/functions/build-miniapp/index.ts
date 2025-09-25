import {
  extname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

import { createClient } from "../_shared/client.ts";
import { corsHeaders as buildCorsHeaders } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const DEFAULT_BUCKET = "miniapp";
const DEFAULT_INDEX_KEY = "index.html";
const DEFAULT_ASSET_PREFIX = "assets";
const STATIC_ROOT = fromFileUrl(new URL("../miniapp/static/", import.meta.url));

const MIME_OVERRIDES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const LONG_CACHE_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
]);

interface BuildFile {
  relativePath: string;
  absolutePath: string;
}

function readEnv(key: string, fallback?: string): string | undefined {
  const value = Deno.env.get(key)?.trim();
  if (
    value && value.toLowerCase() !== "undefined" &&
    value.toLowerCase() !== "null"
  ) {
    return value;
  }
  return fallback;
}

function guessContentType(path: string): string {
  const ext = extname(path).toLowerCase();
  return MIME_OVERRIDES[ext] ?? "application/octet-stream";
}

function cacheControlFor(path: string): string {
  const ext = extname(path).toLowerCase();
  if (
    ext === ".html" || ext === ".json" || ext === ".webmanifest" ||
    ext === ".txt"
  ) {
    return "no-cache";
  }
  if (LONG_CACHE_EXTENSIONS.has(ext)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=86400";
}

async function collectBuildFiles(root: string): Promise<BuildFile[]> {
  const results: BuildFile[] = [];

  async function walk(dir: string, prefix = ""): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      const absolutePath = join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory) {
        await walk(absolutePath, relativePath);
      } else if (entry.isFile) {
        results.push({ relativePath, absolutePath });
      }
    }
  }

  await walk(root);
  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function mapStorageKey(
  relativePath: string,
  indexKey: string,
  assetPrefix: string,
): string {
  if (relativePath === "index.html") return indexKey;
  if (relativePath.startsWith("assets/")) {
    const suffix = relativePath.slice("assets/".length);
    const trimmed = assetPrefix.replace(/\/+$/, "");
    return trimmed ? `${trimmed}/${suffix}` : suffix;
  }
  return relativePath;
}

function responseHeaders(req: Request): HeadersInit {
  return {
    ...buildCorsHeaders(req, "POST,OPTIONS"),
    "content-type": "application/json; charset=utf-8",
  };
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: buildCorsHeaders(req, "POST,OPTIONS"),
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: responseHeaders(req),
      },
    );
  }

  const adminSecret = readEnv("ADMIN_API_SECRET");
  if (adminSecret) {
    const headerSecret = req.headers.get("x-admin-secret");
    if (headerSecret !== adminSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: responseHeaders(req),
        },
      );
    }
  }

  const bucket = readEnv("MINIAPP_BUCKET", DEFAULT_BUCKET) ?? DEFAULT_BUCKET;
  const indexKey = readEnv("MINIAPP_INDEX_KEY", DEFAULT_INDEX_KEY) ??
    DEFAULT_INDEX_KEY;
  const assetPrefix = readEnv("MINIAPP_ASSETS_PREFIX", DEFAULT_ASSET_PREFIX) ??
    DEFAULT_ASSET_PREFIX;

  try {
    let buildFiles: BuildFile[];
    try {
      buildFiles = await collectBuildFiles(STATIC_ROOT);
    } catch (err) {
      console.error("[build-miniapp] Failed to read static directory:", err);
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Mini app static bundle not found. Run scripts/build-miniapp.sh first.",
        }),
        {
          status: 500,
          headers: responseHeaders(req),
        },
      );
    }

    if (buildFiles.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Static bundle is empty. Run scripts/build-miniapp.sh before deploying.",
        }),
        {
          status: 500,
          headers: responseHeaders(req),
        },
      );
    }

    const supabase = createClient("service");

    const uploads: Array<Record<string, unknown>> = [];
    let totalBytes = 0;

    for (const file of buildFiles) {
      const data = await Deno.readFile(file.absolutePath);
      const storageKey = mapStorageKey(
        file.relativePath,
        indexKey,
        assetPrefix,
      );
      const contentType = guessContentType(storageKey);
      const cacheControl = cacheControlFor(storageKey);

      const { error } = await supabase.storage.from(bucket).upload(
        storageKey,
        data,
        {
          upsert: true,
          contentType,
          cacheControl,
        },
      );

      if (error) {
        console.error(
          `[build-miniapp] Upload failed for ${storageKey}:`,
          error,
        );
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Failed to upload ${storageKey}`,
            details: error.message ?? error.error,
          }),
          {
            status: 500,
            headers: responseHeaders(req),
          },
        );
      }

      totalBytes += data.byteLength;
      uploads.push({
        path: file.relativePath,
        storageKey,
        bytes: data.byteLength,
        contentType,
        cacheControl,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        bucket,
        indexKey,
        assetPrefix,
        filesUploaded: uploads.length,
        bytesUploaded: totalBytes,
        uploads,
      }),
      {
        headers: responseHeaders(req),
      },
    );
  } catch (error) {
    console.error("[build-miniapp] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message ?? "Unexpected error",
      }),
      {
        status: 500,
        headers: responseHeaders(req),
      },
    );
  }
});

export default handler;
