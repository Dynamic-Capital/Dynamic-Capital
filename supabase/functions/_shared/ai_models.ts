import { createClient, type SupabaseClient } from "./client.ts";

const DEFAULT_BUCKET = "ai-models";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

async function getClient(): Promise<SupabaseClient> {
  return createClient("service");
}

async function downloadText(
  client: SupabaseClient,
  bucket: string,
  key: string,
): Promise<string | null> {
  try {
    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) {
      console.warn(
        `[ai-models] Failed to download ${key} from ${bucket}`,
        error,
      );
      return null;
    }
    return await data.text();
  } catch (error) {
    console.error(`[ai-models] Error downloading ${key} from ${bucket}`, error);
    return null;
  }
}

export type ModelLoadOptions = {
  bucket?: string;
  disableCache?: boolean;
};

export async function loadJsonModel<T>(
  key: string,
  options: ModelLoadOptions = {},
): Promise<T | null> {
  const bucket = options.bucket ?? DEFAULT_BUCKET;
  const cacheKey = `${bucket}:${key}`;

  if (!options.disableCache) {
    const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.value;
    }
  }

  const client = await getClient();
  const text = await downloadText(client, bucket, key);
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as T;
    cache.set(cacheKey, { value: parsed, fetchedAt: Date.now() });
    return parsed;
  } catch (error) {
    console.error(`[ai-models] Unable to parse JSON model at ${key}`, error);
    return null;
  }
}

export function clearModelCache(): void {
  cache.clear();
}
