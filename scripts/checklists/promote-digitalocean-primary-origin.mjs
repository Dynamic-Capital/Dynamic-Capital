#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const PRIMARY_DOMAIN = "dynamic-capital.ondigitalocean.app";
const PRIMARY_ORIGIN = `https://${PRIMARY_DOMAIN}`;
const TELEGRAM_WEBHOOK = `${PRIMARY_ORIGIN}/webhook`;
const SECONDARY_ORIGINS = [
  PRIMARY_ORIGIN,
  "https://dynamic.capital",
  "https://dynamic-capital.vercel.app",
  "https://dynamic-capital.lovable.app",
];
const ALLOWED_ORIGINS = SECONDARY_ORIGINS.join(",");
const EXPECTED_ALIAS_DOMAINS = [
  "dynamic-capital.vercel.app",
  "dynamic-capital.lovable.app",
];
const EXPECTED_ZONE_IPS = ["162.159.140.98", "172.66.0.96"];

const results = [];

function record(ok, message) {
  results.push({ ok, message });
}

function expect(condition, successMessage, failureMessage) {
  if (condition) {
    record(true, successMessage);
  } else {
    record(false, failureMessage);
  }
}

function formatValue(value) {
  if (value === undefined || value === null) {
    return "<missing>";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

async function readProjectFile(relativePath) {
  const filePath = path.join(PROJECT_ROOT, relativePath);
  return await readFile(filePath, "utf8");
}

function findEnvValue(envs, key) {
  return envs.find((entry) => entry?.key === key)?.value;
}

async function checkDoAppSpec() {
  let spec;
  try {
    const content = await readProjectFile(".do/app.yml");
    spec = YAML.parse(content);
  } catch (error) {
    record(
      false,
      `.do/app.yml: unable to read or parse YAML (${error?.message ?? error}).`,
    );
    return;
  }

  const specRoot = spec?.spec;
  if (!specRoot || typeof specRoot !== "object") {
    record(false, `.do/app.yml: missing top-level spec definition.`);
    return;
  }

  const domains = Array.isArray(specRoot.domains) ? specRoot.domains : [];
  const primaryEntry = domains.find((entry) =>
    entry?.domain === PRIMARY_DOMAIN
  );
  expect(
    Boolean(primaryEntry),
    `.do/app.yml: primary domain entry present for ${PRIMARY_DOMAIN}.`,
    `.do/app.yml: missing primary domain entry for ${PRIMARY_DOMAIN}.`,
  );
  if (primaryEntry) {
    expect(
      primaryEntry.type === "PRIMARY",
      `.do/app.yml: ${PRIMARY_DOMAIN} marked as PRIMARY domain.`,
      `.do/app.yml: ${PRIMARY_DOMAIN} should be marked as PRIMARY (found ${
        formatValue(primaryEntry.type)
      }).`,
    );
  }

  const aliasDomains = new Set(
    domains.map((entry) => entry?.domain).filter(Boolean),
  );
  for (const alias of EXPECTED_ALIAS_DOMAINS) {
    expect(
      aliasDomains.has(alias),
      `.do/app.yml: alias ${alias} registered alongside primary domain.`,
      `.do/app.yml: alias domain ${alias} missing from spec.domains.`,
    );
  }

  const ingressAuthority = specRoot.ingress?.rules?.[0]?.match?.authority
    ?.exact;
  expect(
    ingressAuthority === PRIMARY_DOMAIN,
    `.do/app.yml: ingress authority targets ${PRIMARY_DOMAIN}.`,
    `.do/app.yml: ingress authority should match ${PRIMARY_DOMAIN} (found ${
      formatValue(ingressAuthority)
    }).`,
  );

  const globalEnvs = Array.isArray(specRoot.envs) ? specRoot.envs : [];
  const service = Array.isArray(specRoot.services)
    ? specRoot.services.find((item) => item?.name === "dynamic-capital")
    : undefined;
  const serviceEnvs = Array.isArray(service?.envs) ? service.envs : [];

  const envExpectations = [
    ["SITE_URL", PRIMARY_ORIGIN],
    ["NEXT_PUBLIC_SITE_URL", PRIMARY_ORIGIN],
    ["ALLOWED_ORIGINS", ALLOWED_ORIGINS],
    ["MINIAPP_ORIGIN", PRIMARY_ORIGIN],
    ["TELEGRAM_WEBHOOK_URL", TELEGRAM_WEBHOOK],
  ];

  for (const [key, expectedValue] of envExpectations) {
    const globalValue = findEnvValue(globalEnvs, key);
    expect(
      globalValue === expectedValue,
      `.do/app.yml: global ${key} pinned to ${expectedValue}.`,
      `.do/app.yml: global ${key} should be ${expectedValue} (found ${
        formatValue(globalValue)
      }).`,
    );

    const serviceValue = findEnvValue(serviceEnvs, key);
    expect(
      serviceValue === expectedValue,
      `.do/app.yml: service ${key} pinned to ${expectedValue}.`,
      `.do/app.yml: service ${key} should be ${expectedValue} (found ${
        formatValue(serviceValue)
      }).`,
    );
  }
}

async function checkVercelConfig() {
  let config;
  try {
    const raw = await readProjectFile("vercel.json");
    config = JSON.parse(raw);
  } catch (error) {
    record(
      false,
      `vercel.json: unable to read or parse JSON (${error?.message ?? error}).`,
    );
    return;
  }

  const env = config?.env ?? {};
  const envExpectations = [
    ["SITE_URL", PRIMARY_ORIGIN],
    ["NEXT_PUBLIC_SITE_URL", PRIMARY_ORIGIN],
    ["ALLOWED_ORIGINS", ALLOWED_ORIGINS],
    ["MINIAPP_ORIGIN", PRIMARY_ORIGIN],
    ["TELEGRAM_WEBHOOK_URL", TELEGRAM_WEBHOOK],
  ];

  for (const [key, expectedValue] of envExpectations) {
    const actual = env?.[key];
    expect(
      actual === expectedValue,
      `vercel.json: ${key} pinned to ${expectedValue}.`,
      `vercel.json: ${key} should be ${expectedValue} (found ${
        formatValue(actual)
      }).`,
    );
  }
}

function extractTomlSection(content, header) {
  const headerPattern = new RegExp(
    `^\\s*\\[${header.replaceAll(".", "\\.")}\\]\\s*$`,
    "m",
  );
  const headerMatch = headerPattern.exec(content);
  if (!headerMatch) {
    return "";
  }

  const start = headerMatch.index + headerMatch[0].length;
  const remainder = content.slice(start);
  const nextHeaderPattern = /^\s*\[[^\]]+\]\s*$/m;
  const nextHeaderMatch = nextHeaderPattern.exec(remainder);
  return nextHeaderMatch
    ? remainder.slice(0, nextHeaderMatch.index)
    : remainder;
}

function extractTomlArrayStrings(block, key) {
  const pattern = new RegExp(`${key}\\s*=\\s*\\[(.*?)\\]`, "s");
  const match = block.match(pattern);
  if (!match) {
    return null;
  }
  return Array.from(match[1].matchAll(/"([^"\\]+)"/g)).map((entry) => entry[1]);
}

function extractTomlString(block, key) {
  const pattern = new RegExp(`${key}\\s*=\\s*"([^"]+)"`);
  const match = block.match(pattern);
  return match ? match[1] : undefined;
}

async function checkSupabaseConfig() {
  let content;
  try {
    content = await readProjectFile("supabase/config.toml");
  } catch (error) {
    record(
      false,
      `supabase/config.toml: unable to read file (${error?.message ?? error}).`,
    );
    return;
  }

  const globalSection = extractTomlSection(content, "global");
  const functionsSection = extractTomlSection(content, "functions.env");

  const siteUrl = extractTomlString(globalSection, "site_url");
  expect(
    siteUrl === PRIMARY_ORIGIN,
    "supabase/config.toml: global site_url pinned to DigitalOcean origin.",
    `supabase/config.toml: site_url should be ${PRIMARY_ORIGIN} (found ${
      formatValue(siteUrl)
    }).`,
  );

  const redirectUrls = extractTomlArrayStrings(
    globalSection,
    "additional_redirect_urls",
  );
  if (!redirectUrls) {
    record(
      false,
      "supabase/config.toml: additional_redirect_urls block missing.",
    );
  } else {
    expect(
      redirectUrls.length === SECONDARY_ORIGINS.length &&
        redirectUrls.every((url, index) => url === SECONDARY_ORIGINS[index]),
      "supabase/config.toml: additional_redirect_urls mirror canonical origin ordering.",
      `supabase/config.toml: additional_redirect_urls should be ${
        SECONDARY_ORIGINS.join(", ")
      } (found ${redirectUrls.join(", ")}).`,
    );
  }

  const functionEnvExpectations = [
    ["SITE_URL", PRIMARY_ORIGIN],
    ["NEXT_PUBLIC_SITE_URL", PRIMARY_ORIGIN],
    ["ALLOWED_ORIGINS", ALLOWED_ORIGINS],
    ["MINIAPP_ORIGIN", PRIMARY_ORIGIN],
    ["TELEGRAM_WEBHOOK_URL", TELEGRAM_WEBHOOK],
  ];

  for (const [key, expectedValue] of functionEnvExpectations) {
    const actual = extractTomlString(functionsSection, key);
    expect(
      actual === expectedValue,
      `supabase/config.toml: functions.env ${key} pinned to ${expectedValue}.`,
      `supabase/config.toml: functions.env ${key} should be ${expectedValue} (found ${
        formatValue(actual)
      }).`,
    );
  }
}

async function checkProjectToml() {
  let content;
  try {
    content = await readProjectFile("project.toml");
  } catch (error) {
    record(
      false,
      `project.toml: unable to read file (${error?.message ?? error}).`,
    );
    return;
  }

  const envBlocks = Array.from(
    content.matchAll(/\[\[build\.env\]\]([\s\S]*?)(?=\n\s*\[[^\n]+\]|$)/g),
  );
  const envMap = new Map();
  for (const [, block] of envBlocks) {
    const name = extractTomlString(block, "name");
    const value = extractTomlString(block, "value");
    if (name) {
      envMap.set(name, value);
    }
  }

  const expectations = [
    ["SITE_URL", PRIMARY_ORIGIN],
    ["NEXT_PUBLIC_SITE_URL", PRIMARY_ORIGIN],
    ["ALLOWED_ORIGINS", ALLOWED_ORIGINS],
    ["MINIAPP_ORIGIN", PRIMARY_ORIGIN],
    ["TELEGRAM_WEBHOOK_URL", TELEGRAM_WEBHOOK],
  ];

  for (const [key, expectedValue] of expectations) {
    const actual = envMap.get(key);
    expect(
      actual === expectedValue,
      `project.toml: build.env ${key} pinned to ${expectedValue}.`,
      `project.toml: build.env ${key} should be ${expectedValue} (found ${
        formatValue(actual)
      }).`,
    );
  }
}

async function checkBrandingEnv() {
  let content;
  try {
    content = await readProjectFile("scripts/utils/branding-env.mjs");
  } catch (error) {
    record(
      false,
      `scripts/utils/branding-env.mjs: unable to read file (${
        error?.message ?? error
      }).`,
    );
    return;
  }

  const originMatch = content.match(/PRODUCTION_ORIGIN\s*=\s*"([^"]+)"/);
  const listMatch = content.match(
    /PRODUCTION_ALLOWED_ORIGIN_LIST\s*=\s*\[([\s\S]*?)\]/,
  );

  const originValue = originMatch ? originMatch[1] : undefined;
  expect(
    originValue === PRIMARY_ORIGIN,
    "scripts/utils/branding-env.mjs: PRODUCTION_ORIGIN pinned to DigitalOcean origin.",
    `scripts/utils/branding-env.mjs: PRODUCTION_ORIGIN should be ${PRIMARY_ORIGIN} (found ${
      formatValue(originValue)
    }).`,
  );

  if (!listMatch) {
    record(
      false,
      "scripts/utils/branding-env.mjs: PRODUCTION_ALLOWED_ORIGIN_LIST missing.",
    );
  } else {
    const entries = Array.from(listMatch[1].matchAll(/"([^"]+)"/g)).map((
      match,
    ) => match[1]);
    expect(
      entries.length === SECONDARY_ORIGINS.length &&
        entries.every((entry, index) => entry === SECONDARY_ORIGINS[index]),
      "scripts/utils/branding-env.mjs: PRODUCTION_ALLOWED_ORIGIN_LIST mirrors canonical ordering.",
      `scripts/utils/branding-env.mjs: PRODUCTION_ALLOWED_ORIGIN_LIST should be ${
        SECONDARY_ORIGINS.join(", ")
      } (found ${entries.join(", ")}).`,
    );
  }
}

async function checkDnsZone() {
  let content;
  try {
    content = await readProjectFile(
      "dns/dynamic-capital.ondigitalocean.app.zone",
    );
  } catch (error) {
    record(
      false,
      `dns/dynamic-capital.ondigitalocean.app.zone: unable to read file (${
        error?.message ?? error
      }).`,
    );
    return;
  }

  for (const ip of EXPECTED_ZONE_IPS) {
    expect(
      content.includes(ip),
      `dns/dynamic-capital.ondigitalocean.app.zone: A record includes ${ip}.`,
      `dns/dynamic-capital.ondigitalocean.app.zone: missing A record for ${ip}.`,
    );
  }
}

async function checkSiteConfigHelpers() {
  let content;
  try {
    content = await readProjectFile(
      "scripts/digitalocean/site-config-utils.mjs",
    );
  } catch (error) {
    record(
      false,
      `scripts/digitalocean/site-config-utils.mjs: unable to read file (${
        error?.message ?? error
      }).`,
    );
    return;
  }

  const origins = Array.from(
    content.matchAll(/PRODUCTION_ALLOWED_ORIGINS\s*=\s*\[([\s\S]*?)\]/g),
  ).flatMap(([, block]) =>
    Array.from(block.matchAll(/"([^"]+)"/g)).map((match) => match[1])
  );

  expect(
    origins.length >= SECONDARY_ORIGINS.length &&
      SECONDARY_ORIGINS.every((origin) => origins.includes(origin)),
    "scripts/digitalocean/site-config-utils.mjs: PRODUCTION_ALLOWED_ORIGINS include canonical hosts.",
    "scripts/digitalocean/site-config-utils.mjs: PRODUCTION_ALLOWED_ORIGINS should include DigitalOcean canonical host and aliases.",
  );
}

async function main() {
  await checkDoAppSpec();
  await checkVercelConfig();
  await checkSupabaseConfig();
  await checkProjectToml();
  await checkBrandingEnv();
  await checkDnsZone();
  await checkSiteConfigHelpers();

  let hasFailure = false;
  for (const { ok, message } of results) {
    if (ok) {
      console.log(`✅ ${message}`);
    } else {
      hasFailure = true;
      console.error(`❌ ${message}`);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    `❌ promote-digitalocean-primary-origin checklist failed: ${
      error?.message ?? error
    }`,
  );
  process.exit(1);
});
