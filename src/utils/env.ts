export function getEnvVar(name: string): string | undefined {
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    const v = Deno.env.get(name);
    if (v) return v;
  }
  const v = import.meta.env?.[`VITE_${name}` as keyof ImportMetaEnv];
  return typeof v === "string" ? v : undefined;
}

export function requireEnvVar(name: string): string {
  const v = getEnvVar(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function optionalEnvVar(name: string): string | undefined {
  return getEnvVar(name);
}
