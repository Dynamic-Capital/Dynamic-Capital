export function getEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const nextKey = `NEXT_PUBLIC_${name}`;
  if (process.env[nextKey]) return process.env[nextKey];
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
