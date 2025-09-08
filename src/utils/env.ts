export function getEnvVar(name: string): string | undefined {
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    const v = Deno.env.get(name);
    if (v) return v;
  }
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  try {
    const meta = (globalThis as any)?.import?.meta;
    if (meta?.env) {
      if (meta.env[name]) return meta.env[name];
      const viteKey = `VITE_${name}`;
      if (meta.env[viteKey]) return meta.env[viteKey];
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function requireEnvVar(name: string): string {
  const v = getEnvVar(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function optionalEnvVar(name: string): string | undefined {
  return getEnvVar(name);
}
