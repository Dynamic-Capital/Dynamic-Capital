// Support both Node and Deno environments
declare const process:
  | { env: Record<string, string | undefined> }
  | undefined;
declare const Deno: { env: { get(key: string): string | undefined } } | undefined;

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    try {
      return Deno.env.get(key) ?? undefined;
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
  const prefixes = ["", "NEXT_PUBLIC_"];
  const names = [name, ...aliases];
  for (const n of names) {
    for (const p of prefixes) {
      const v = readEnv(`${p}${n}`);
      if (v) return v;
    }
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
