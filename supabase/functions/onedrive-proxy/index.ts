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
  ONEDRIVE_PROXY_SECRET,
} = requireEnv(
  [
    "ONEDRIVE_TENANT_ID",
    "ONEDRIVE_CLIENT_ID",
    "ONEDRIVE_CLIENT_SECRET",
    "ONEDRIVE_PROXY_SECRET",
  ] as const,
);

const DEFAULT_SCOPE = optionalEnv("ONEDRIVE_SCOPE") ??
  "https://graph.microsoft.com/.default";
const DEFAULT_DRIVE_ID = optionalEnv("ONEDRIVE_DEFAULT_DRIVE_ID");

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

  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
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

function authorizeProxyRequest(req: Request): Response | null {
  const token = extractBearerToken(req.headers.get("Authorization"));
  if (!token || !timingSafeEqual(token, ONEDRIVE_PROXY_SECRET)) {
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

interface GraphListResponse {
  value?: GraphDriveItem[];
  "@odata.nextLink"?: string | null;
  "@odata.deltaLink"?: string | null;
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

interface ListRequest {
  action: "list";
  driveId?: unknown;
  itemId?: unknown;
  path?: unknown;
  top?: unknown;
  orderBy?: unknown;
}

interface GetRequest {
  action: "get";
  driveId?: unknown;
  itemId?: unknown;
  path?: unknown;
  select?: unknown;
  expand?: unknown;
}

interface DownloadRequest {
  action: "download";
  driveId?: unknown;
  itemId?: unknown;
}

interface UploadRequest {
  action: "upload";
  driveId?: unknown;
  path?: unknown;
  content?: unknown;
  encoding?: unknown;
  contentType?: unknown;
  conflictBehavior?: unknown;
}

type RequestPayload =
  | ListRequest
  | GetRequest
  | DownloadRequest
  | UploadRequest;

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} must not be empty`);
  }
  return trimmed;
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

function parseTop(value: unknown): number | null {
  let parsed: number | null = null;
  if (typeof value === "number" && Number.isFinite(value)) {
    parsed = value;
  } else if (typeof value === "string") {
    const asNumber = Number.parseInt(value, 10);
    if (Number.isFinite(asNumber)) {
      parsed = asNumber;
    }
  }
  if (parsed === null) {
    return null;
  }
  const clamped = Math.max(1, Math.min(200, Math.floor(parsed)));
  return clamped;
}

function parseSelect(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => typeof entry === "string" ? entry.trim() : "")
      .filter((entry) => entry.length > 0);
    return parts.length > 0 ? parts.join(",") : null;
  }
  return null;
}

function parseEncoding(value: unknown): UploadEncoding {
  return value === "base64" ? "base64" : "utf-8";
}

function parseConflictBehavior(value: unknown): ConflictBehavior {
  if (value === "fail" || value === "rename" || value === "replace") {
    return value;
  }
  return "replace";
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ""));
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeUploadContent(
  value: unknown,
  encoding: UploadEncoding,
): Uint8Array {
  if (typeof value !== "string") {
    throw new Error("content must be a string");
  }
  if (encoding === "base64") {
    return base64ToBytes(value);
  }
  return new TextEncoder().encode(value);
}

function resolveContentType(
  value: unknown,
  encoding: UploadEncoding,
): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return encoding === "utf-8"
    ? "text/plain; charset=utf-8"
    : "application/octet-stream";
}

function normalizeDriveItem(
  item: GraphDriveItem | null | undefined,
): DriveItemMeta | null {
  if (!item?.id) {
    return null;
  }
  const name = item.name?.trim();
  const size = typeof item.size === "number" && Number.isFinite(item.size)
    ? item.size
    : null;
  const childCount = typeof item.folder?.childCount === "number" &&
      Number.isFinite(item.folder.childCount)
    ? item.folder.childCount
    : null;
  const hashes = item.file?.hashes
    ? {
      quickXorHash: item.file.hashes.quickXorHash ?? null,
      sha1Hash: item.file.hashes.sha1Hash ?? null,
      sha256Hash: item.file.hashes.sha256Hash ?? null,
    }
    : null;
  return {
    id: item.id,
    name: name && name.length > 0 ? name : item.id,
    size,
    webUrl: item.webUrl ?? null,
    lastModifiedDateTime: item.lastModifiedDateTime ?? null,
    createdDateTime: item.createdDateTime ?? null,
    isFolder: Boolean(item.folder),
    childCount,
    mimeType: item.file?.mimeType ?? null,
    parentId: item.parentReference?.id ?? null,
    parentPath: item.parentReference?.path ?? null,
    eTag: item.eTag ?? null,
    cTag: item.cTag ?? null,
    downloadUrl: item["@microsoft.graph.downloadUrl"] ?? null,
    hashes,
  } satisfies DriveItemMeta;
}

async function handleList(
  request: ListRequest,
  req: Request,
): Promise<Response> {
  const driveId = resolveDriveId(request.driveId);
  const basePath = buildItemPath(driveId, {
    itemId: request.itemId,
    path: request.path,
  });

  const params = new URLSearchParams();
  const top = parseTop(request.top);
  if (top !== null) {
    params.set("$top", `${top}`);
  }
  if (
    typeof request.orderBy === "string" && request.orderBy.trim().length > 0
  ) {
    params.set("$orderby", request.orderBy.trim());
  }
  const query = params.toString();
  const childrenSuffix =
    basePath.includes("/items/") || basePath.endsWith("/root")
      ? "/children"
      : ":/children";
  const response = await graphRequest<GraphListResponse>(
    `${basePath}${childrenSuffix}${query ? `?${query}` : ""}`,
  );

  const items = (response.value ?? [])
    .map((item) => normalizeDriveItem(item))
    .filter((item): item is DriveItemMeta => Boolean(item));

  return jsonResponse(
    {
      items,
      nextLink: response["@odata.nextLink"] ?? null,
      deltaLink: response["@odata.deltaLink"] ?? null,
    },
    { status: 200 },
    req,
  );
}

async function handleGet(request: GetRequest, req: Request): Promise<Response> {
  const driveId = resolveDriveId(request.driveId);
  const basePath = buildItemPath(driveId, {
    itemId: request.itemId,
    path: request.path,
  });
  const params = new URLSearchParams();
  const select = parseSelect(request.select);
  if (select) {
    params.set("$select", select);
  }
  const expand = parseSelect(request.expand);
  if (expand) {
    params.set("$expand", expand);
  }
  const query = params.toString();
  const payload = await graphRequest<GraphDriveItem>(
    `${basePath}${query ? `?${query}` : ""}`,
  );
  const item = normalizeDriveItem(payload);
  if (!item) {
    throw new Error("Drive item not found");
  }
  return jsonResponse({ item }, { status: 200 }, req);
}

async function handleDownload(
  request: DownloadRequest,
  req: Request,
): Promise<Response> {
  const driveId = resolveDriveId(request.driveId);
  const itemId = ensureString(request.itemId, "itemId");
  const select =
    "@microsoft.graph.downloadUrl,id,name,size,webUrl,parentReference,lastModifiedDateTime,createdDateTime,file,eTag,cTag";
  const payload = await graphRequest<GraphDriveItem>(
    `/drives/${driveId}/items/${encodeURIComponent(itemId)}?$select=${
      encodeURIComponent(select)
    }`,
  );
  const item = normalizeDriveItem(payload);
  if (!item) {
    throw new Error("Drive item not found");
  }
  return jsonResponse(
    {
      item,
      downloadUrl: item.downloadUrl,
    },
    { status: 200 },
    req,
  );
}

async function handleUpload(
  request: UploadRequest,
  req: Request,
): Promise<Response> {
  const driveId = resolveDriveId(request.driveId);
  const rawPath = ensureString(request.path, "path");
  const normalized = normalizePath(rawPath);
  if (!normalized) {
    throw new Error("path must not be empty");
  }
  const encoding = parseEncoding(request.encoding);
  const content = encodeUploadContent(request.content, encoding);
  const contentType = resolveContentType(request.contentType, encoding);
  const conflictBehavior = parseConflictBehavior(request.conflictBehavior);
  const query = new URLSearchParams();
  query.set("@microsoft.graph.conflictBehavior", conflictBehavior);
  const path = `/drives/${driveId}/root:/${
    encodeItemPath(normalized)
  }:/content${query.size > 0 ? `?${query.toString()}` : ""}`;

  const payload = await graphRequest<GraphDriveItem>(path, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: content,
  });

  const item = normalizeDriveItem(payload);
  if (!item) {
    throw new Error("Upload completed but response was empty");
  }

  return jsonResponse({ item }, { status: 200 }, req);
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return methodNotAllowed(req);
  }

  const unauthorized = authorizeProxyRequest(req);
  if (unauthorized) {
    return unauthorized;
  }

  let payload: RequestPayload;
  try {
    payload = await req.json() as RequestPayload;
  } catch {
    return bad("Invalid JSON payload", undefined, req);
  }

  if (!payload || typeof payload !== "object" || !("action" in payload)) {
    return bad("Invalid request payload", undefined, req);
  }

  try {
    switch (payload.action) {
      case "list":
        return await handleList(payload, req);
      case "get":
        return await handleGet(payload, req);
      case "download":
        return await handleDownload(payload, req);
      case "upload":
        return await handleUpload(payload, req);
      default:
        return bad(`Unsupported action: ${payload.action}`, undefined, req);
    }
  } catch (error) {
    console.error("[onedrive-proxy] action failed", payload.action, error);
    const hint = error instanceof Error ? error.message : error;
    return oops("OneDrive proxy request failed", hint, req);
  }
});

export default handler;
