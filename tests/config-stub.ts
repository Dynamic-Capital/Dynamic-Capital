export function envOrSetting<T = string>(key: string): Promise<T | null> {
  const value = Deno.env.get(key);
  return Promise.resolve((value as unknown as T) ?? null);
}

export function getContent<T = string>(_key: string): Promise<T | null> {
  return Promise.resolve(null);
}
