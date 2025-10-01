#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { promises as fs } from "node:fs";
import { parseArgs } from "node:util";
import YAML from "yaml";

import { normalizeAppSpec } from "./site-config-utils.mjs";

const API_BASE_URL = "https://api.digitalocean.com/v2";
const USER_AGENT = "dynamic-capital-sync-site-config/1.0";

function usage() {
  console.log(
    `Sync the DigitalOcean App Platform spec using the DigitalOcean REST API.\n\n` +
      `Usage:\n  node scripts/digitalocean/sync-site-config.mjs --app-id <id> --site-url https://example.com [options]\n\n` +
      `Options:\n` +
      `  --app-id <id>             DigitalOcean App Platform app ID (required unless --spec is used)\n` +
      `  --site-url <url>         Canonical site URL to enforce (required)\n` +
      `  --token <value>          DigitalOcean API token (defaults to DIGITALOCEAN_TOKEN env var)\n` +
      `  --allowed-origins <list> Override the comma-separated CORS allow list\n` +
      `  --domain <host>          Override the hostname portion of the site URL\n` +
      `  --zone <domain>          DNS zone name (defaults to the site URL host)\n` +
      `  --service <name>         Service name to update (default: dynamic-capital)\n` +
      `  --spec <path>           Load an existing app spec from a local YAML file\n` +
      `  --output <path>          Write the updated spec YAML to a file\n` +
      `  --apply                  Push the updated spec via the DigitalOcean API\n` +
      `  --show-spec              Print the rendered YAML to stdout\n` +
      `  --help                   Display this help message\n`,
  );
}

function resolveToken(tokenFlag) {
  return tokenFlag ?? process.env.DIGITALOCEAN_TOKEN ?? "";
}

function assertToken(token, { require }) {
  if (require && (!token || token.trim().length === 0)) {
    throw new Error(
      "A DigitalOcean API token is required. Provide --token or set DIGITALOCEAN_TOKEN.",
    );
  }
}

async function fetchAppSpec(appId, token) {
  const response = await fetch(`${API_BASE_URL}/apps/${appId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    let message =
      `DigitalOcean API request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message += `: ${errorBody.message}`;
      }
    } catch (error) {
      // ignore JSON parse issues
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const spec = payload?.app?.spec;
  if (!spec || typeof spec !== "object") {
    throw new Error("DigitalOcean API response did not include an app spec.");
  }

  return { spec };
}

async function updateAppSpecRemote(appId, token, spec) {
  const response = await fetch(`${API_BASE_URL}/apps/${appId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ spec }),
  });

  if (!response.ok) {
    let message =
      `Failed to update app spec via DigitalOcean API (status ${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message += `: ${errorBody.message}`;
      }
    } catch (error) {
      // ignore JSON parse issues
    }
    throw new Error(message);
  }

  return await response.json();
}

async function main() {
  const { values } = parseArgs({
    options: {
      "app-id": { type: "string" },
      "site-url": { type: "string" },
      token: { type: "string" },
      "allowed-origins": { type: "string" },
      domain: { type: "string" },
      zone: { type: "string" },
      service: { type: "string", default: "dynamic-capital" },
      spec: { type: "string" },
      output: { type: "string" },
      apply: { type: "boolean", default: false },
      "show-spec": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    usage();
    process.exit(0);
  }

  const appId = values["app-id"];
  const siteUrl = values["site-url"];
  const specPath = values.spec
    ? path.resolve(process.cwd(), values.spec)
    : undefined;
  const tokenFlag = values.token;
  const token = resolveToken(tokenFlag);

  if (!appId && !specPath) {
    usage();
    throw new Error(
      "--app-id is required unless --spec supplies a local app spec.",
    );
  }

  if (!siteUrl) {
    usage();
    throw new Error(
      "--site-url is required (e.g. https://dynamic-capital.ondigitalocean.app).",
    );
  }

  if (!specPath) {
    assertToken(token, { require: true });
  }

  const domainOverride = values.domain;
  const zoneOverride = values.zone;
  const serviceName = values.service ?? "dynamic-capital";
  const requestedAllowedOrigins = values["allowed-origins"];

  let parsedSpec;
  let specSource;

  if (specPath) {
    try {
      const fileContents = await fs.readFile(specPath, "utf8");
      parsedSpec = YAML.parse(fileContents);
      specSource = specPath;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to read spec file at ${specPath}. ${reason}`);
    }
  } else {
    const { spec } = await fetchAppSpec(appId, token);
    parsedSpec = { spec };
    specSource = "DigitalOcean API";
  }

  const spec = (parsedSpec && typeof parsedSpec === "object" && parsedSpec.spec)
    ? parsedSpec.spec
    : parsedSpec;

  if (!spec || typeof spec !== "object") {
    throw new Error("Unexpected spec format encountered.");
  }

  const {
    canonicalSiteUrl,
    canonicalOrigin,
    domain,
    zone,
    allowedOrigins,
    changes,
  } = normalizeAppSpec({
    spec,
    siteUrl,
    domain: domainOverride,
    zone: zoneOverride,
    serviceName,
    allowedOriginsOverride: requestedAllowedOrigins,
  });

  const rendered = YAML.stringify(parsedSpec, { lineWidth: 0 });
  const outputPath = values.output
    ? path.resolve(process.cwd(), values.output)
    : undefined;

  if (outputPath) {
    await fs.writeFile(outputPath, rendered, "utf8");
    console.log(`Updated spec written to ${outputPath}.`);
  }

  if (values["show-spec"]) {
    console.log("\n----- Updated spec preview -----\n");
    console.log(rendered);
    console.log("----- End preview -----\n");
  }

  console.log("DigitalOcean app configuration summary:");
  if (appId) {
    console.log(`  App ID: ${appId}`);
  } else {
    console.log("  App ID: (not provided; local spec only)");
  }
  console.log(`  Service: ${serviceName}`);
  console.log(`  Site URL: ${canonicalSiteUrl}`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Zone: ${zone}`);
  console.log(`  Allowed origins: ${allowedOrigins}`);
  console.log(`  Miniapp origin: ${canonicalOrigin}`);
  console.log(`  Spec source: ${specSource}`);
  if (outputPath) {
    console.log(`  Output: ${outputPath}`);
  } else {
    console.log(
      "  Output: (dry-run only; pass --output to write the updated spec)",
    );
  }

  if (changes.length > 0) {
    console.log("  Applied updates:");
    for (const change of changes) {
      console.log(`    - ${change}`);
    }
  } else {
    console.log(
      "  No changes detected; the spec already matched the requested configuration.",
    );
  }

  if (values.apply) {
    assertToken(token, { require: true });
    if (!appId) {
      throw new Error(
        "--apply requires --app-id to target the DigitalOcean app.",
      );
    }
    console.log("\nApplying spec update via DigitalOcean API...");
    await updateAppSpecRemote(appId, token, spec);
    console.log("✅ App spec updated successfully.");
  } else {
    console.log(
      "\nDry run complete. Re-run with --apply to push the spec to DigitalOcean.",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
