import {
  createClient,
  type SupabaseClient,
} from "@/integrations/supabase/client";
import type {
  ListAssetsOptions,
  OneDriveAssetMeta,
  OneDriveAssetRow,
} from "./types";

const ONE_DRIVE_ASSETS_TABLE = "one_drive_assets";

function ensureServiceClient(client?: SupabaseClient) {
  if (client) {
    return client;
  }
  if (typeof window !== "undefined") {
    throw new Error(
      "Wrapper helpers require a server-side Supabase client with service role access.",
    );
  }
  return createClient("service");
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseSize(raw: string | null): number | null {
  if (!raw) return null;
  const numeric = Number.parseInt(raw, 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeAsset(
  row: OneDriveAssetRow | null,
): OneDriveAssetMeta | null {
  if (!row?.object_key) {
    return null;
  }
  const title = row.title?.trim();
  return {
    key: row.object_key,
    title: title && title.length > 0 ? title : row.object_key,
    description: row.description?.trim() || null,
    contentType: row.content_type?.trim() || null,
    sizeBytes: parseSize(row.byte_size),
    lastModified: row.last_modified?.trim() || null,
    checksum: row.checksum?.trim() || null,
    sourceUrl: row.source_url?.trim() || null,
    tags: parseTags(row.tags),
  } satisfies OneDriveAssetMeta;
}

function escapeLikePattern(input: string) {
  return input.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * Fetches the list of mirrored OneDrive files exposed through the S3 wrapper manifest.
 *
 * @example
 * ```ts
 * import { listOneDriveAssets } from '@/integrations/wrappers';
 *
 * const files = await listOneDriveAssets({ prefix: 'docs/' });
 * files.forEach((asset) => console.log(asset.key, asset.sourceUrl));
 * ```
 */
export async function listOneDriveAssets(
  options: ListAssetsOptions = {},
  client?: SupabaseClient,
): Promise<OneDriveAssetMeta[]> {
  const supabase = ensureServiceClient(client);
  const { prefix, search, limit } = options;

  let query = supabase
    .from(ONE_DRIVE_ASSETS_TABLE)
    .select("*")
    .order("object_key", { ascending: true });

  if (prefix) {
    const escapedPrefix = `${escapeLikePattern(prefix)}%`;
    query = query.ilike("object_key", escapedPrefix);
  }

  if (search) {
    const escapedSearch = `%${escapeLikePattern(search)}%`;
    query = query.or(
      `title.ilike.${escapedSearch},description.ilike.${escapedSearch},tags.ilike.${escapedSearch}`,
    );
  }

  if (typeof limit === "number" && Number.isFinite(limit)) {
    query = query.limit(Math.max(1, Math.floor(limit)));
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(
      error.message || "Failed to list OneDrive assets through S3 wrapper.",
    );
  }

  const rows = (data as OneDriveAssetRow[] | null) ?? [];

  return rows
    .map((row) => normalizeAsset(row))
    .filter((asset): asset is OneDriveAssetMeta => Boolean(asset));
}

/**
 * Loads a single OneDrive asset manifest entry by its object key.
 */
export async function getOneDriveAsset(
  objectKey: string,
  client?: SupabaseClient,
): Promise<OneDriveAssetMeta | null> {
  const supabase = ensureServiceClient(client);
  const { data, error } = await supabase
    .from(ONE_DRIVE_ASSETS_TABLE)
    .select("*")
    .eq("object_key", objectKey)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(
      error.message || "Failed to load OneDrive asset manifest entry.",
    );
  }

  return normalizeAsset((data as OneDriveAssetRow | null) ?? null);
}

export { ONE_DRIVE_ASSETS_TABLE };
export type { ListAssetsOptions, OneDriveAssetMeta } from "./types";
