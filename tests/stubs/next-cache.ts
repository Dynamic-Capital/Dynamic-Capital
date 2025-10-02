export type CacheFactory = <T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
  _keyParts: string[],
  _options?: { revalidate?: number; tags?: string[] },
) => (...args: A) => Promise<T>;

export const unstable_cache: CacheFactory = (fn) => fn;
