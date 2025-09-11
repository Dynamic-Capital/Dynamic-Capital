// Support both Node and Deno environments
declare const process:
  | { env: Record<string, string | undefined> }
  | undefined;
declare const Deno: { env: { get(key: string): string | undefined } } | undefined;

function sanitize(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const val = v.trim();
  if (val === "" || val.toLowerCase() === "undefined" || val.toLowerCase() === "null") {
    return undefined;
  }
  return val;
}

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    const v = sanitize(process.env[key]);
    if (v !== undefined) return v;
  }
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    try {
      const v = sanitize(Deno.env.get(key) ?? undefined);
      if (v !== undefined) return v;
    } catch {
      // ignore permission errors
    }
  }
  return undefined;
}

export function getEnvVar(
  name: string,
  aliases: string[] = [],
): string | undefined {
  const names = [name, ...aliases];
  for (const n of names) {
    const v = readEnv(n);
    if (v !== undefined) return v;
  }
  return undefined;
}

export function requireEnvVar(
  name: string,
  aliases: string[] = [],
): string {
  const v = getEnvVar(name, aliases);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function optionalEnvVar(
  name: string,
  aliases: string[] = [],
): string | undefined {
  return getEnvVar(name, aliases);
}
