import { optionalEnv, requireEnv } from "../_shared/env.ts";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
  unauth,
} from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

const {
  ONEDRIVE_TENANT_ID,
  ONEDRIVE_CLIENT_ID,
  ONEDRIVE_CLIENT_SECRET,
  ONEDRIVE_WEBHOOK_SECRET,
} = requireEnv(
  [
    "ONEDRIVE_TENANT_ID",
    "ONEDRIVE_CLIENT_ID",
    "ONEDRIVE_CLIENT_SECRET",
    "ONEDRIVE_WEBHOOK_SECRET",
  ] as const,
);

const DEFAULT_SCOPE = optionalEnv("ONEDRIVE_SCOPE") ??
  "https://graph.microsoft.com/.default";
const DEFAULT_DRIVE_ID = optionalEnv("ONEDRIVE_DEFAULT_DRIVE_ID");
const EXPECTED_CLIENT_STATE = optionalEnv("ONEDRIVE_WEBHOOK_CLIENT_STATE") ??
  ONEDRIVE_WEBHOOK_SECRET;

interface TokenCache {
  token: string;
  scope: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function nowMs() {
  return Date.now();
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.scope === DEFAULT_SCOPE) {
    if (tokenCache.expiresAt > nowMs()) {
      return tokenCache.token;
    }
  }

  const tokenUrl =
    `https://login.microsoftonline.com/${ONEDRIVE_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: ONEDRIVE_CLIENT_ID,
    client_secret: ONEDRIVE_CLIENT_SECRET,
    scope: DEFAULT_SCOPE,
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Failed to acquire OneDrive token (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const payload = await response.json() as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("OneDrive token response did not include access_token");
  }

  const expiresInSeconds = Number(payload.expires_in ?? 3600);
  const ttl = Number.isFinite(expiresInSeconds)
    ? Math.max(60, Math.floor(expiresInSeconds))
    : 3600;
  const safetyWindowMs = 60 * 1000;

  tokenCache = {
    token: payload.access_token,
    scope: DEFAULT_SCOPE,
    expiresAt: nowMs() + ttl * 1000 - safetyWindowMs,
  };

  return payload.access_token;
}

async function graphRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json; charset=utf-8");
  }

  const url = path.startsWith("http")
    ? path
    : `${GRAPH_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    let detail: unknown = null;
    if (isJson) {
      try {
        detail = await response.json();
      } catch {
        detail = await response.text();
      }
    } else {
      detail = await response.text();
    }
    const detailText = typeof detail === "string"
      ? detail
      : JSON.stringify(detail);
    throw new Error(
      `Microsoft Graph request failed (${response.status} ${response.statusText}): ${detailText}`,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (isJson) {
    return await response.json() as T;
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

async function graphFetchBinary(
  path: string,
  init: RequestInit = {},
): Promise<Uint8Array> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  const url = path.startsWith("http")
    ? path
    : `${GRAPH_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Microsoft Graph binary fetch failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  if (trimmed.slice(0, 7).toLowerCase() === "bearer ") {
    const token = trimmed.slice(7).trim();
    return token.length > 0 ? token : null;
  }
  return trimmed;
}

function authorizeActionRequest(req: Request): Response | null {
  const token = extractBearerToken(req.headers.get("Authorization"));
  if (!token || !timingSafeEqual(token, ONEDRIVE_WEBHOOK_SECRET)) {
    return unauth("Missing or invalid credentials", req);
  }
  return null;
}

type UploadEncoding = "utf-8" | "base64";

type ConflictBehavior = "fail" | "replace" | "rename";

interface GraphHashes {
  quickXorHash?: string | null;
  sha1Hash?: string | null;
  sha256Hash?: string | null;
}

interface GraphDriveItem {
  id?: string;
  name?: string;
  size?: number;
  webUrl?: string | null;
  lastModifiedDateTime?: string | null;
  createdDateTime?: string | null;
  file?: {
    mimeType?: string | null;
    hashes?: GraphHashes | null;
  } | null;
  folder?: {
    childCount?: number | null;
  } | null;
  parentReference?: {
    id?: string | null;
    path?: string | null;
    driveId?: string | null;
  } | null;
  eTag?: string | null;
  cTag?: string | null;
  "@microsoft.graph.downloadUrl"?: string | null;
}

interface DriveItemMeta {
  id: string;
  name: string;
  size: number | null;
  webUrl: string | null;
  lastModifiedDateTime: string | null;
  createdDateTime: string | null;
  isFolder: boolean;
  childCount: number | null;
  mimeType: string | null;
  parentId: string | null;
  parentPath: string | null;
  eTag: string | null;
  cTag: string | null;
  downloadUrl: string | null;
  hashes: GraphHashes | null;
}

interface ReadRequest {
  action: "read";
  driveId?: unknown;
  itemId?: unknown;
  path?: unknown;
  includeContent?: unknown;
  encoding?: unknown;
}

interface WriteRequest {
  action: "write";
  driveId?: unknown;
  path?: unknown;
  content?: unknown;
  encoding?: unknown;
  contentType?: unknown;
  conflictBehavior?: unknown;
}

type RequestPayload = ReadRequest | WriteRequest | Record<string, unknown>;

interface GraphNotification {
  subscriptionId?: string;
  resource?: string;
  tenantId?: string;
  siteUrl?: string;
  expirationDateTime?: string;
  changeType?: string;
  clientState?: string;
  resourceData?: {
    id?: string;
    driveId?: string;
    parentReference?: {
      driveId?: string;
      id?: string;
    } | null;
  } | null;
}

function hasValidClientState(notification: GraphNotification): boolean {
  const candidate = notification.clientState?.trim();
  if (!candidate) {
    return false;
  }
  return timingSafeEqual(candidate, EXPECTED_CLIENT_STATE);
}

function resolveDriveId(input: unknown): string {
  if (typeof input === "string" && input.trim().length > 0) {
    return input.trim();
  }
  if (DEFAULT_DRIVE_ID && DEFAULT_DRIVE_ID.trim().length > 0) {
    return DEFAULT_DRIVE_ID.trim();
  }
  throw new Error(
    "driveId is required when ONEDRIVE_DEFAULT_DRIVE_ID is not configured",
  );
}

function normalizePath(path: unknown): string | null {
  if (typeof path !== "string") {
    return null;
  }
  const trimmed = path.trim().replace(/^\/+|\/+$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

function encodeItemPath(path: string): string {
  return path.split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildItemPath(
  driveId: string,
  options: { itemId?: unknown; path?: unknown },
): string {
  if (typeof options.itemId === "string" && options.itemId.trim().length > 0) {
    return `/drives/${driveId}/items/${
      encodeURIComponent(options.itemId.trim())
    }`;
  }
  const normalized = normalizePath(options.path);
  if (normalized) {
    return `/drives/${driveId}/root:/${encodeItemPath(normalized)}`;
  }
  return `/drives/${driveId}/root`;
}

function normalizeDriveItem(item: GraphDriveItem): DriveItemMeta {
  return {
    id: item.id ?? "",
    name: item.name ?? "",
    size: typeof item.size === "number" ? item.size : null,
    webUrl: item.webUrl ?? null,
    lastModifiedDateTime: item.lastModifiedDateTime ?? null,
    createdDateTime: item.createdDateTime ?? null,
    isFolder: !!item.folder,
    childCount: item.folder?.childCount ?? null,
    mimeType: item.file?.mimeType ?? null,
    parentId: item.parentReference?.id ?? null,
    parentPath: item.parentReference?.path ?? null,
    eTag: item.eTag ?? null,
    cTag: item.cTag ?? null,
    downloadUrl: (item as GraphDriveItem)["@microsoft.graph.downloadUrl"] ??
      null,
    hashes: item.file?.hashes ?? null,
  };
}

function decodeUploadContent(
  content: unknown,
  encoding: UploadEncoding,
): Uint8Array {
  if (typeof content !== "string") {
    throw new Error("content must be a string when uploading");
  }
  if (encoding === "base64") {
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new TextEncoder().encode(content);
}

function encodeDownloadContent(
  bytes: Uint8Array,
  encoding: UploadEncoding,
): string {
  if (encoding === "base64") {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return new TextDecoder().decode(bytes);
}

async function handleRead(
  payload: ReadRequest,
  req: Request,
): Promise<Response> {
  const driveId = resolveDriveId(payload.driveId);
  const itemPath = buildItemPath(driveId, {
    itemId: payload.itemId,
    path: payload.path,
  });

  const item = await graphRequest<GraphDriveItem>(`${itemPath}`);
  const meta = normalizeDriveItem(item);

  const includeContent = payload.includeContent === true ||
    payload.includeContent === "true";
  if (!includeContent) {
    return jsonResponse({ item: meta }, { status: 200 }, req);
  }

  const encoding: UploadEncoding = payload.encoding === "base64"
    ? "base64"
    : "utf-8";
  const usingItemId = typeof payload.itemId === "string" &&
    payload.itemId.trim().length > 0;
  const contentPath = usingItemId
    ? `${itemPath}/content`
    : `${itemPath}:/content`;
  const bytes = await graphFetchBinary(contentPath, {
    method: "GET",
  });
  const content = encodeDownloadContent(bytes, encoding);

  return jsonResponse({ item: meta, content, encoding }, { status: 200 }, req);
}

async function handleWrite(
  payload: WriteRequest,
  req: Request,
): Promise<Response> {
  const driveId = resolveDriveId(payload.driveId);
  const path = normalizePath(payload.path);
  if (!path) {
    throw new Error("path is required for write action");
  }

  const encoding: UploadEncoding = payload.encoding === "base64"
    ? "base64"
    : "utf-8";
  const bytes = decodeUploadContent(payload.content, encoding);

  const conflict: ConflictBehavior | null =
    typeof payload.conflictBehavior === "string" &&
      ["fail", "replace", "rename"].includes(payload.conflictBehavior)
      ? payload.conflictBehavior as ConflictBehavior
      : null;

  const conflictParam = conflict
    ? `?@microsoft.graph.conflictBehavior=${conflict}`
    : "";

  const uploadPath = `/drives/${driveId}/root:/${
    encodeItemPath(path)
  }:/content${conflictParam}`;

  const headers = new Headers();
  headers.set(
    "Content-Type",
    typeof payload.contentType === "string"
      ? payload.contentType
      : "application/octet-stream",
  );

  const response = await graphRequest<GraphDriveItem>(uploadPath, {
    method: "PUT",
    headers,
    body: bytes,
  });

  return jsonResponse(
    { item: normalizeDriveItem(response) },
    { status: 200 },
    req,
  );
}

async function processNotifications(
  notifications: GraphNotification[],
  req: Request,
): Promise<Response> {
  const results = await Promise.all(
    notifications.map(async (notification) => {
      if (!hasValidClientState(notification)) {
        console.warn("[onedrive-webhook] invalid clientState", {
          subscriptionId: notification.subscriptionId,
        });
        return { notification, error: "Invalid clientState" };
      }
      const resource = notification.resource?.trim();
      if (!resource) {
        return { notification, error: "Missing resource" };
      }
      try {
        const item = await graphRequest<GraphDriveItem>(resource);
        return { notification, item: normalizeDriveItem(item) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[onedrive-webhook] failed to fetch resource", {
          resource,
          error: message,
        });
        return { notification, error: message };
      }
    }),
  );

  return jsonResponse(
    { ok: true, notifications: results },
    { status: 200 },
    req,
  );
}

async function handlePost(req: Request): Promise<Response> {
  let payload: RequestPayload;
  try {
    payload = await req.json() as RequestPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return bad("Invalid JSON payload", { message }, req);
  }

  if (payload && typeof payload === "object" && "action" in payload) {
    const unauthorized = authorizeActionRequest(req);
    if (unauthorized) {
      return unauthorized;
    }
    const action = (payload as ReadRequest | WriteRequest).action;
    try {
      if (action === "read") {
        return await handleRead(payload as ReadRequest, req);
      }
      if (action === "write") {
        return await handleWrite(payload as WriteRequest, req);
      }
      return bad(`Unsupported action: ${action}`, undefined, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return oops("OneDrive action failed", { action, message }, req);
    }
  }

  const notifications = Array.isArray((payload as { value?: unknown })?.value)
    ? (payload as { value: GraphNotification[] }).value
    : null;

  if (notifications) {
    return await processNotifications(notifications, req);
  }

  return bad("Unsupported payload", undefined, req);
}

async function handleRequest(req: Request): Promise<Response> {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(req, "GET,POST,OPTIONS"),
        },
      });
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const validationToken = url.searchParams.get("validationToken");
      if (validationToken) {
        return new Response(validationToken, {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            ...corsHeaders(req, "GET,POST,OPTIONS"),
          },
        });
      }
      return jsonResponse({ ok: true }, { status: 200 }, req);
    }

    if (req.method !== "POST") {
      return methodNotAllowed(req);
    }

    return await handlePost(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[onedrive-webhook] unexpected error", error);
    return oops("Unhandled error", { message }, req);
  }
}

export const handler = registerHandler(handleRequest);
