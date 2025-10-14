// Support both Node and Deno environments
declare const process:
  | { env: Record<string, string | undefined> }
  | undefined;
declare const Deno:
  | { env: { get(key: string): string | undefined } }
  | undefined;

type ImportMetaWithEnv = { env?: Record<string, unknown> };

function readImportMetaEnv(): Record<string, unknown> | undefined {
  try {
    const { env } = import.meta as unknown as ImportMetaWithEnv;
    if (env && typeof env === "object") {
      return env;
    }
  } catch {
    // import.meta may not be available in all runtimes
  }
  return undefined;
}

function sanitize(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const val = v.trim();
  if (
    val === "" || val.toLowerCase() === "undefined" ||
    val.toLowerCase() === "null"
  ) {
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
  const metaEnv = readImportMetaEnv();
  if (metaEnv && key in metaEnv) {
    const raw = metaEnv[key];
    if (typeof raw === "string") {
      const v = sanitize(raw);
      if (v !== undefined) return v;
    } else if (typeof raw === "number" || typeof raw === "boolean") {
      const v = sanitize(String(raw));
      if (v !== undefined) return v;
    }
  }
  return undefined;
}

export function getEnvVar(
  name: string,
  aliases: readonly string[] = [],
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
  aliases: readonly string[] = [],
): string {
  const v = getEnvVar(name, aliases);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function optionalEnvVar(
  name: string,
  aliases: readonly string[] = [],
): string | undefined {
  return getEnvVar(name, aliases);
}
