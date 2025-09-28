import { Buffer } from "node:buffer";
import {
  createClient,
  type SupabaseClient,
} from "@/integrations/supabase/client";

const FUNCTION_NAME = "onedrive-proxy";

export interface OneDriveHashes {
  quickXorHash?: string | null;
  sha1Hash?: string | null;
  sha256Hash?: string | null;
}

export interface OneDriveDriveItem {
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
  hashes: OneDriveHashes | null;
}

export interface ListDriveItemsOptions {
  driveId?: string;
  path?: string;
  itemId?: string;
  top?: number;
  orderBy?: string;
}

export interface ListDriveItemsResponse {
  items: OneDriveDriveItem[];
  nextLink: string | null;
  deltaLink: string | null;
}

export interface GetDriveItemOptions {
  driveId?: string;
  path?: string;
  itemId?: string;
  select?: string | string[];
  expand?: string | string[];
}

export interface DownloadDriveItemOptions {
  driveId?: string;
  itemId: string;
}

export interface DownloadDriveItemResponse {
  item: OneDriveDriveItem;
  downloadUrl: string | null;
}

export type UploadConflictBehavior = "fail" | "replace" | "rename";
export type UploadEncoding = "utf-8" | "base64";

export type UploadContent = string | Uint8Array | ArrayBuffer;

export interface UploadDriveItemOptions {
  driveId?: string;
  path: string;
  content: UploadContent;
  encoding?: UploadEncoding;
  contentType?: string;
  conflictBehavior?: UploadConflictBehavior;
}

interface InvokeOptions<T> {
  payload: Record<string, unknown>;
  client?: SupabaseClient;
}

function ensureServiceClient(client?: SupabaseClient) {
  if (client) {
    return client;
  }
  if (typeof window !== "undefined") {
    throw new Error(
      "OneDrive helpers require a server-side Supabase client with service access.",
    );
  }
  return createClient("service");
}

async function invokeOneDrive<T>({
  payload,
  client,
}: InvokeOptions<T>): Promise<T> {
  const supabase = ensureServiceClient(client);
  const { data, error } = await supabase.functions.invoke<T>(FUNCTION_NAME, {
    body: payload,
  });

  if (error) {
    throw new Error(error.message ?? "OneDrive proxy invocation failed");
  }

  if (!data) {
    throw new Error("OneDrive proxy returned an empty response");
  }

  return data;
}

function normalizeSelect(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(",");
    return joined.length > 0 ? joined : undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toBase64(input: Uint8Array | ArrayBuffer): string {
  const buffer = input instanceof Uint8Array
    ? Buffer.from(input)
    : Buffer.from(new Uint8Array(input));
  return buffer.toString("base64");
}

function normalizeUploadContent(
  content: UploadContent,
  explicitEncoding?: UploadEncoding,
): { encoded: string; encoding: UploadEncoding } {
  if (typeof content === "string") {
    const encoding: UploadEncoding = explicitEncoding ?? "utf-8";
    return { encoded: content, encoding };
  }
  const encoded = toBase64(content);
  return { encoded, encoding: "base64" };
}

export async function listDriveItems(
  options: ListDriveItemsOptions = {},
  client?: SupabaseClient,
): Promise<ListDriveItemsResponse> {
  const payload: Record<string, unknown> = { action: "list" };
  if (options.driveId) payload.driveId = options.driveId;
  if (options.path) payload.path = options.path;
  if (options.itemId) payload.itemId = options.itemId;
  if (typeof options.top === "number") payload.top = options.top;
  if (options.orderBy) payload.orderBy = options.orderBy;
  return await invokeOneDrive<ListDriveItemsResponse>({ payload, client });
}

export async function getDriveItem(
  options: GetDriveItemOptions,
  client?: SupabaseClient,
): Promise<OneDriveDriveItem> {
  const payload: Record<string, unknown> = { action: "get" };
  if (options.driveId) payload.driveId = options.driveId;
  if (options.path) payload.path = options.path;
  if (options.itemId) payload.itemId = options.itemId;
  const select = normalizeSelect(options.select);
  if (select) payload.select = select;
  const expand = normalizeSelect(options.expand);
  if (expand) payload.expand = expand;

  const { item } = await invokeOneDrive<{ item: OneDriveDriveItem }>({
    payload,
    client,
  });
  return item;
}

export async function getDriveItemDownloadUrl(
  options: DownloadDriveItemOptions,
  client?: SupabaseClient,
): Promise<DownloadDriveItemResponse> {
  const payload: Record<string, unknown> = {
    action: "download",
    itemId: options.itemId,
  };
  if (options.driveId) payload.driveId = options.driveId;
  return await invokeOneDrive<DownloadDriveItemResponse>({ payload, client });
}

export async function uploadDriveItem(
  options: UploadDriveItemOptions,
  client?: SupabaseClient,
): Promise<OneDriveDriveItem> {
  const { encoded, encoding } = normalizeUploadContent(
    options.content,
    options.encoding,
  );

  const payload: Record<string, unknown> = {
    action: "upload",
    path: options.path,
    content: encoded,
    encoding,
  };

  if (options.driveId) payload.driveId = options.driveId;
  if (options.contentType) payload.contentType = options.contentType;
  if (options.conflictBehavior) {
    payload.conflictBehavior = options.conflictBehavior;
  }

  const { item } = await invokeOneDrive<{ item: OneDriveDriveItem }>({
    payload,
    client,
  });
  return item;
}
