export async function fetchFromStorage(
  client: any,
  bucket: string,
  key: string,
): Promise<Uint8Array | null> {
  try {
    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) {
      return null;
    }
    return new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}

