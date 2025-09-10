import type { SupabaseClient } from "../_shared/client.ts";

export async function fetchFromStorage(
  client: SupabaseClient,
  bucket: string,
  key: string,
): Promise<Uint8Array | null> {
  try {
    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) {
      console.warn(`[miniapp] Storage fetch failed for ${key}:`, error);
      return null;
    }
    console.log(`[miniapp] Successfully fetched ${key} from storage`);
    return new Uint8Array(await data.arrayBuffer());
  } catch (e) {
    console.error(`[miniapp] Storage fetch error for ${key}:`, e);
    return null;
  }
}
