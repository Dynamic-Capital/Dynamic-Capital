import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { getServiceClient } from "../_shared/client.ts";
import { maybe, need } from "../_shared/env.ts";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
} from "../_shared/http.ts";
import { createLogger } from "../_shared/logger.ts";
import { registerHandler } from "../_shared/serve.ts";

const FUNCTION_NAME = "huggingface-image-captioning";
const MODEL_ID = maybe("HUGGINGFACE_IMAGE_CAPTION_MODEL") ??
  "nlpconnect/vit-gpt2-image-captioning";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB safety limit
const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
]);

const HF_ACCESS_TOKEN = need("HUGGINGFACE_ACCESS_TOKEN");
const HF_API_URL = maybe("HUGGINGFACE_IMAGE_CAPTION_ENDPOINT") ??
  `https://api-inference.huggingface.co/models/${MODEL_ID}`;
const SUPABASE_URL = maybe("SUPABASE_URL") ??
  maybe("NEXT_PUBLIC_SUPABASE_URL") ??
  "https://stub.supabase.co";
let serviceRoleKeyCache = maybe("SUPABASE_SERVICE_ROLE_KEY") ??
  maybe("SUPABASE_SERVICE_ROLE");

class SignedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignedUrlError";
  }
}
const supabase = getServiceClient();

const storageObjectSchema = z.object({
  id: z.string().nullish(),
  bucket_id: z.string().nullish(),
  name: z.string().nullish(),
  path_tokens: z.array(z.string()).nullish(),
  metadata: z.record(z.unknown()).nullish(),
  mime_type: z.string().nullish(),
});

const payloadSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string(),
  schema: z.string(),
  record: storageObjectSchema.nullish(),
  old_record: storageObjectSchema.nullish(),
});

type StorageObjectRecord = z.infer<typeof storageObjectSchema>;

const IMAGE_MIME_PREFIXES = ["image/"];

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ensureServiceRoleKey(): string {
  if (!serviceRoleKeyCache) {
    serviceRoleKeyCache = maybe("SUPABASE_SERVICE_ROLE_KEY") ??
      maybe("SUPABASE_SERVICE_ROLE");
  }
  if (!serviceRoleKeyCache) {
    throw new Error("Missing Supabase service role key");
  }
  return serviceRoleKeyCache;
}

function extractMime(record: StorageObjectRecord): string | null {
  const direct = normalizeString(record.mime_type);
  if (direct) return direct.toLowerCase();

  const metadata = record.metadata;
  if (metadata && typeof metadata === "object") {
    const mimetype = normalizeString(
      (metadata as Record<string, unknown>)["mimetype"],
    ) ?? normalizeString((metadata as Record<string, unknown>)["mimeType"]);
    if (mimetype) return mimetype.toLowerCase();
  }
  return null;
}

function hasSupportedExtension(record: StorageObjectRecord): boolean {
  const candidates: string[] = [];
  if (record.name) candidates.push(record.name);
  if (Array.isArray(record.path_tokens) && record.path_tokens.length > 0) {
    candidates.push(record.path_tokens[record.path_tokens.length - 1]);
  }
  for (const candidate of candidates) {
    const ext = candidate.split(".").pop()?.toLowerCase();
    if (ext && IMAGE_EXTENSIONS.has(ext)) {
      return true;
    }
  }
  return false;
}

function isProcessableImage(record: StorageObjectRecord): boolean {
  const mime = extractMime(record);
  if (mime && IMAGE_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return true;
  }
  return hasSupportedExtension(record);
}

async function fetchSignedObject(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download object (${response.status})`);
  }
  const contentType = normalizeString(response.headers.get("content-type"));
  if (
    contentType &&
    !IMAGE_MIME_PREFIXES.some((prefix) => contentType.startsWith(prefix))
  ) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (!Number.isNaN(size) && size > MAX_IMAGE_BYTES) {
      throw new Error(`Object is too large: ${size} bytes`);
    }
  }
  return await response.blob();
}

async function createSignedUrl(
  bucketId: string,
  objectPath: string,
): Promise<string> {
  const encodedPath = objectPath.split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const serviceRoleKey = ensureServiceRoleKey();

  if (
    SUPABASE_URL.includes("stub.supabase.co") ||
    !serviceRoleKey.includes(".")
  ) {
    return `https://signed.example/${encodedPath}?token=${crypto.randomUUID()}`;
  }
  const url = new URL(
    `/storage/v1/object/sign/${bucketId}/${encodedPath}`,
    SUPABASE_URL,
  );

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 60 }),
  });

  if (!response.ok) {
    let hint: string | null = null;
    try {
      const text = await response.text();
      hint = normalizeString(text);
    } catch {
      hint = null;
    }
    const message = hint
      ? `${response.status}: ${hint}`
      : String(response.status);
    throw new SignedUrlError(`Supabase storage sign failed (${message})`);
  }

  const payload = await response.json() as {
    signedURL?: string | null;
    signedUrl?: string | null;
  };
  const signedUrl = normalizeString(
    payload.signedUrl ?? payload.signedURL ?? undefined,
  );
  if (!signedUrl) {
    throw new SignedUrlError("Signed URL missing from Supabase response");
  }
  return signedUrl;
}

function extractCaption(payload: unknown): string | null {
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const candidate = normalizeString(
        (entry as { generated_text?: unknown })?.generated_text,
      );
      if (candidate) return candidate;
    }
  }
  if (payload && typeof payload === "object") {
    const candidate = normalizeString(
      (payload as { generated_text?: unknown }).generated_text,
    );
    if (candidate) return candidate;
    const errorMessage = normalizeString(
      (payload as { error?: unknown }).error,
    );
    if (errorMessage) {
      throw new Error(`Hugging Face error: ${errorMessage}`);
    }
  }
  if (typeof payload === "string") {
    const candidate = normalizeString(payload);
    if (candidate) return candidate;
  }
  return null;
}

async function generateCaption(blob: Blob): Promise<string> {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_ACCESS_TOKEN}`,
      "Content-Type": blob.type || "application/octet-stream",
    },
    body: blob,
  });

  if (!response.ok) {
    let hint: string | null = null;
    try {
      const text = await response.text();
      hint = normalizeString(text);
    } catch {
      hint = null;
    }
    const waitHeader = normalizeString(
      response.headers.get("x-wait-for-model"),
    );
    const detail = hint || waitHeader || response.statusText;
    const message = detail
      ? `${response.status}: ${detail}`
      : String(response.status);
    throw new Error(`Hugging Face request failed (${message})`);
  }

  const payload = await response.json();
  const caption = extractCaption(payload);
  if (!caption) {
    throw new Error("No caption generated");
  }
  return caption;
}

async function storeCaption(id: string, caption: string): Promise<void> {
  const { error } = await supabase
    .from("image_caption")
    .upsert({ id, caption }, { onConflict: "id" });
  if (error) {
    throw new Error(`Failed to store caption: ${error.message}`);
  }
}

function buildRequestLogger(req: Request) {
  const requestId = req.headers.get("sb-request-id") ||
    req.headers.get("x-request-id") ||
    crypto.randomUUID();
  return createLogger({ function: FUNCTION_NAME, requestId });
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(req, "POST,OPTIONS") },
    });
  }
  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  const logger = buildRequestLogger(req);

  let rawPayload: unknown;
  try {
    rawPayload = await req.json();
  } catch {
    logger.warn("Invalid JSON body received");
    return bad("Invalid JSON body", undefined, req);
  }

  const parsed = payloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    logger.warn("Payload validation failed", parsed.error.flatten());
    return jsonResponse(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
      req,
    );
  }

  const payload = parsed.data;
  const record = payload.record;

  if (!record || payload.type === "DELETE") {
    logger.info("Skipping event without record", { type: payload.type });
    return jsonResponse(
      { skipped: true, reason: "no_record" },
      { status: 200 },
      req,
    );
  }

  const bucketId = normalizeString(record.bucket_id);
  const objectId = normalizeString(record.id) ?? normalizeString(record.name);
  let pathTokens: string[];
  if (Array.isArray(record.path_tokens)) {
    pathTokens = record.path_tokens
      .map((token) => normalizeString(token))
      .filter((token): token is string => Boolean(token));
  } else {
    const normalizedName = normalizeString(record.name);
    pathTokens = normalizedName ? [normalizedName] : [];
  }

  if (!bucketId || pathTokens.length === 0) {
    logger.warn("Missing object path information", {
      bucketId,
      pathTokens,
    });
    return bad("Missing storage object path information", undefined, req);
  }

  if (!objectId) {
    logger.warn("Missing object identifier", { bucketId });
    return bad("Missing storage object identifier", undefined, req);
  }

  if (!isProcessableImage(record)) {
    logger.info("Skipping non-image object", {
      bucketId,
      objectId,
      mimeType: extractMime(record),
    });
    return jsonResponse(
      { skipped: true, reason: "unsupported_mime_type" },
      { status: 200 },
      req,
    );
  }

  const objectPath = pathTokens.join("/");

  try {
    const signedUrl = await createSignedUrl(bucketId, objectPath);
    const blob = await fetchSignedObject(signedUrl);
    const caption = await generateCaption(blob);
    await storeCaption(objectId, caption);

    logger.info("Caption stored", { bucketId, objectId });
    return jsonResponse({ caption }, { status: 200 }, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof SignedUrlError) {
      logger.error("Failed to create signed URL", {
        bucketId,
        objectPath,
        error: message,
      });
      return jsonResponse(
        { ok: false, error: "Failed to create signed URL" },
        { status: 502 },
        req,
      );
    }
    logger.error("Caption generation failed", {
      bucketId,
      objectId,
      error: message,
    });
    return oops(message, undefined, req);
  }
});

export default handler;
