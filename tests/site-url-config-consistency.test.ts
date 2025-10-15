import test from "node:test";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";

type EnvSnapshot = Record<string, string>;

const CANONICAL_VALUES = {
  SITE_URL: "https://dynamic-capital.ondigitalocean.app",
  NEXT_PUBLIC_SITE_URL: "https://dynamic-capital.ondigitalocean.app",
  ALLOWED_ORIGINS:
    "https://dynamic.capital,https://dynamiccapital.ton,https://www.dynamiccapital.ton,https://ton.site,https://dynamic-capital-qazf2.ondigitalocean.app,https://dynamic-capital.ondigitalocean.app,https://dynamic-capital-git-dynamic-capital-a2ae79-the-project-archive.vercel.app,https://dynamic-capital-kp5fqeegn-the-project-archive.vercel.app,https://dynamic-capital.vercel.app,https://dynamic-capital.lovable.app,https://ton-gateway.dynamic-capital.ondigitalocean.app,https://ton-gateway.dynamic-capital.lovable.app,https://t.me,https://t.me/Dynamic_VIP_BOT/dynamic_pay",
  MINIAPP_ORIGIN:
    "https://dynamic-capital-qazf2.ondigitalocean.app,https://dynamic-capital.ondigitalocean.app,https://dynamic.capital,https://dynamiccapital.ton,https://t.me,https://t.me/Dynamic_VIP_BOT/dynamic_pay",
  TELEGRAM_WEBHOOK_URL: "https://dynamic-capital.ondigitalocean.app/webhook",
} as const;

const EXPECTED_ORIGINS = splitList(CANONICAL_VALUES.ALLOWED_ORIGINS);

function splitList(value: string | undefined): string[] {
  return value?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
}

function parseProjectEnv(tomlText: string): EnvSnapshot {
  const result: EnvSnapshot = {};
  const pattern = /\[\[build\.env\]\]([\s\S]*?)(?=\n\s*\[\[|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tomlText)) !== null) {
    const block = match[1];
    const nameMatch = /name\s*=\s*"([^"]+)"/.exec(block);
    const valueMatch = /value\s*=\s*"([^"]+)"/.exec(block);
    if (nameMatch && valueMatch) {
      result[nameMatch[1]] = valueMatch[1];
    }
  }
  return result;
}

function extractTomlSection(tomlText: string, header: string): string {
  const escaped = header.replace(/\./g, "\\.");
  const regex = new RegExp(`\\[${escaped}\\]\\s*([\\s\\S]*?)(?=\n\\[[^\\]]+\\]|$)`);
  const section = regex.exec(tomlText);
  if (!section) {
    throw new Error(`Missing [${header}] section in supabase/config.toml`);
  }
  return section[1];
}

function parseSupabaseFunctionsEnv(tomlText: string): EnvSnapshot {
  const block = extractTomlSection(tomlText, "functions.env");
  const result: EnvSnapshot = {};
  const pattern = /^(\s*)([A-Z0-9_]+)\s*=\s*"([^"]*)"/gm;
  let entry: RegExpExecArray | null;
  while ((entry = pattern.exec(block)) !== null) {
    const [, , key, value] = entry;
    result[key] = value;
  }
  return result;
}

function parseSupabaseAuthSiteUrl(tomlText: string): string {
  const block = extractTomlSection(tomlText, "auth");
  const match = block.match(/site_url\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error("Missing auth.site_url in supabase/config.toml");
  }
  return match[1];
}

function parseSupabaseRedirects(tomlText: string): string[] {
  const block = extractTomlSection(tomlText, "auth");
  const match = block.match(/additional_redirect_urls\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error("Missing auth.additional_redirect_urls in supabase/config.toml");
  }
  const entries = match[1].split(",").map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^"|"$/g, ""));
  return entries;
}

test("critical domain configuration stays consistent across environments", async () => {
  const [projectToml, supabaseToml, vercelConfig] = await Promise.all([
    readFile("project.toml", "utf8"),
    readFile("supabase/config.toml", "utf8"),
    readFile("vercel.json", "utf8"),
  ]);

  const projectEnv = parseProjectEnv(projectToml);
  const supabaseEnv = parseSupabaseFunctionsEnv(supabaseToml);
  const vercelEnv = JSON.parse(vercelConfig).env as EnvSnapshot;

  for (const [key, expected] of Object.entries(CANONICAL_VALUES)) {
    assert.equal(
      supabaseEnv[key],
      expected,
      `supabase/config.toml functions.env ${key} drifted`,
    );
    assert.equal(
      projectEnv[key],
      expected,
      `project.toml build.env ${key} drifted`,
    );
    assert.equal(
      vercelEnv[key],
      expected,
      `vercel.json env ${key} drifted`,
    );
  }

  assert.equal(
    parseSupabaseAuthSiteUrl(supabaseToml),
    CANONICAL_VALUES.SITE_URL,
    "supabase auth.site_url must match SITE_URL",
  );

  const redirectOrigins = parseSupabaseRedirects(supabaseToml);
  const missingRedirects = EXPECTED_ORIGINS.filter((origin) =>
    !redirectOrigins.includes(origin)
  );
  assert.deepEqual(
    missingRedirects,
    [],
    `supabase auth.additional_redirect_urls missing: ${missingRedirects.join(", ")}`,
  );

  const unexpectedRedirects = redirectOrigins.filter((origin) =>
    !EXPECTED_ORIGINS.includes(origin)
  );
  assert.deepEqual(
    unexpectedRedirects,
    [],
    `supabase auth.additional_redirect_urls has unexpected entries: ${unexpectedRedirects.join(", ")}`,
  );
});
