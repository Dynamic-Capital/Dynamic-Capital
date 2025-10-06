const decoder = new TextDecoder();

const TELEGRAM_TOKEN_RE = /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/g;
const SUPABASE_JWT_RE =
  /\beyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const ENV_FILE_RE = /\.env(\..+)?$/;

function decodeJwtPayload(token: string): unknown {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = parts[1];
  try {
    const normalized = payload.padEnd(
      payload.length + ((4 - payload.length % 4) % 4),
      "=",
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

const looksLikeServiceRole = (token: string) => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== "object") return false;
  const role = (payload as { role?: unknown }).role;
  return role === "service_role";
};

const extractEnvValue = (line: string): string | null => {
  const match = line.match(/^[A-Z0-9_]+\s*=\s*(.*)$/);
  if (!match) return null;
  const value = match[1]?.trim() ?? "";
  if (!value || value.startsWith("#")) return null;
  return value;
};

const isBinary = (buf: Uint8Array) => {
  for (let i = 0; i < Math.min(buf.length, 1024); i++) {
    if (buf[i] === 0) return true;
  }
  return false;
};

let bad = false;

async function scan(dir: string) {
  for await (const e of Deno.readDir(dir)) {
    const p = dir === "." ? e.name : `${dir}/${e.name}`;
    if (e.isDirectory) {
      if (
        [
          ".git",
          "node_modules",
          "dist",
          "build",
          ".next",
          ".turbo",
          ".vercel",
          ".vscode",
          "coverage",
        ].includes(e.name)
      ) continue;
      await scan(p);
      continue;
    }
    if (p === "scripts/guard-service-role.ts") continue;
    if (/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(p)) {
      continue;
    }
    if (!/\.(t|j)sx?$|\.env|\.ya?ml$|\.jsonc?$/.test(p)) continue;
    const buf = await Deno.readFile(p);
    if (isBinary(buf)) continue;
    const txt = decoder.decode(buf);

    if (txt.match(TELEGRAM_TOKEN_RE)) {
      console.error(
        `Telegram bot token detected in ${p}. Remove and rotate immediately.`,
      );
      bad = true;
    }

    const serviceRoleTokens = txt.match(SUPABASE_JWT_RE) ?? [];
    for (const token of serviceRoleTokens) {
      if (looksLikeServiceRole(token)) {
        console.error(
          `Supabase service role key detected in ${p}. Remove and rotate immediately.`,
        );
        bad = true;
      }
    }

    if (ENV_FILE_RE.test(p)) {
      const lines = txt.split(/\r?\n/);
      for (const line of lines) {
        if (!/^SUPABASE_SERVICE_ROLE(_KEY)?\s*=/.test(line)) continue;
        const value = extractEnvValue(line);
        if (!value) continue;
        if (looksLikeServiceRole(value)) {
          console.error(
            `Supabase service role key detected in ${p}. Remove and rotate immediately.`,
          );
          bad = true;
        }
      }
    }
  }
}
await scan(".");
if (bad) Deno.exit(1);
