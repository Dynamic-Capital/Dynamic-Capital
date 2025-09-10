export async function envOrSetting<T = string>(key: string): Promise<T | null> {
  return (Deno.env.get(key) as unknown as T) ?? null;
}
export let getContent = async (_key: string) => null as any;
