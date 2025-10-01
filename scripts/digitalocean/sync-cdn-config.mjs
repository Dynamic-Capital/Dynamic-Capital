#!/usr/bin/env node

import process from "node:process";
import { parseArgs } from "node:util";

const API_BASE_URL = "https://api.digitalocean.com/v2";
const USER_AGENT = "dynamic-capital-sync-cdn-config/1.0";

function usage() {
  console.log(
    `Sync DigitalOcean CDN endpoint settings for the static asset Space.\n\n` +
      `Usage:\n  node scripts/digitalocean/sync-cdn-config.mjs --space <bucket> --region <slug> [options]\n\n` +
      `Options:\n` +
      `  --space <name>             DigitalOcean Spaces bucket to back the CDN\n` +
      `  --region <slug>            Region of the Space (e.g. nyc3)\n` +
      `  --origin <domain>          Explicit origin domain (overrides --space/--region)\n` +
      `  --endpoint-id <id>         Existing CDN endpoint ID to target\n` +
      `  --custom-domain <domain>   Custom domain to associate with the CDN endpoint\n` +
      `  --certificate-id <id>      Managed certificate ID for the custom domain\n` +
      `  --ttl <seconds>            Cache TTL in seconds (default: 3600)\n` +
      `  --purge <paths>            Comma-separated list of paths to purge (use * for all)\n` +
      `  --token <value>            DigitalOcean API token (defaults to DIGITALOCEAN_TOKEN env var)\n` +
      `  --show-endpoint            Print the resolved endpoint JSON\n` +
      `  --apply                    Create or update the CDN endpoint (dry run otherwise)\n` +
      `  --help                     Display this help message\n`,
  );
}

function resolveToken(flag) {
  return flag ?? process.env.DIGITALOCEAN_TOKEN ?? "";
}

function assertToken(token) {
  if (!token || token.trim().length === 0) {
    throw new Error(
      "A DigitalOcean API token is required. Provide --token or set DIGITALOCEAN_TOKEN.",
    );
  }
}

function coerceOrigin(value) {
  if (!value) return "";
  let trimmed = `${value}`.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      trimmed = url.host;
    } catch {
      trimmed = trimmed.replace(/^https?:\/\//, "");
    }
  }
  return trimmed.replace(/\/+$/, "");
}

function buildOriginFromSpace(space, region) {
  if (!space) {
    return "";
  }
  if (!region) {
    throw new Error("--region is required when --space is provided.");
  }
  return `${space}.${region}.digitaloceanspaces.com`;
}

function parsePositiveInt(value, label) {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

async function apiRequest(path, token, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message =
      `DigitalOcean API ${method} ${path} failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message += `: ${payload.message}`;
      }
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

async function listEndpoints(token) {
  const params = new URLSearchParams({ per_page: "200" });
  const payload = await apiRequest(
    `/cdn/endpoints?${params.toString()}`,
    token,
  );
  if (!payload || !Array.isArray(payload.endpoints)) {
    throw new Error("Unexpected response when listing CDN endpoints.");
  }
  return payload.endpoints;
}

function describeEndpoint(endpoint) {
  if (!endpoint) {
    return "none";
  }
  const parts = [
    `id=${endpoint.id}`,
    `origin=${endpoint.origin}`,
    `endpoint=${endpoint.endpoint}`,
    `ttl=${endpoint.ttl}`,
  ];
  if (endpoint.custom_domain) {
    parts.push(`custom_domain=${endpoint.custom_domain}`);
  }
  if (endpoint.certificate_id) {
    parts.push(`certificate_id=${endpoint.certificate_id}`);
  }
  return parts.join(", ");
}

function computeUpdates(existing, desired) {
  const updates = {};
  if (!existing) {
    return { updates, changes: ["create endpoint"] };
  }
  const changes = [];
  if (desired.ttl !== undefined && desired.ttl !== existing.ttl) {
    updates.ttl = desired.ttl;
    changes.push(`ttl: ${existing.ttl} → ${desired.ttl}`);
  }
  if (
    desired.custom_domain !== undefined &&
    desired.custom_domain !== (existing.custom_domain ?? undefined)
  ) {
    updates.custom_domain = desired.custom_domain;
    changes.push(
      `custom_domain: ${existing.custom_domain ?? "none"} → ${
        desired.custom_domain || "none"
      }`,
    );
  }
  if (
    desired.certificate_id !== undefined &&
    desired.certificate_id !== (existing.certificate_id ?? undefined)
  ) {
    updates.certificate_id = desired.certificate_id;
    changes.push(
      `certificate_id: ${existing.certificate_id ?? "none"} → ${
        desired.certificate_id || "none"
      }`,
    );
  }
  return { updates, changes };
}

function ensureEndpointMatch(endpoints, { endpointId, origin, customDomain }) {
  if (endpointId) {
    return endpoints.find((item) => item?.id === endpointId);
  }
  if (origin) {
    const normalized = origin.toLowerCase();
    const byOrigin = endpoints.find((item) =>
      item?.origin?.toLowerCase() === normalized
    );
    if (byOrigin) {
      return byOrigin;
    }
  }
  if (customDomain) {
    const normalized = customDomain.toLowerCase();
    return endpoints.find((item) =>
      item?.custom_domain?.toLowerCase() === normalized
    );
  }
  return undefined;
}

async function purgeCache(endpointId, token, files) {
  const payload = { files };
  await apiRequest(`/cdn/endpoints/${endpointId}/cache`, token, {
    method: "DELETE",
    body: payload,
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      space: { type: "string" },
      region: { type: "string" },
      origin: { type: "string" },
      "endpoint-id": { type: "string" },
      "custom-domain": { type: "string" },
      "certificate-id": { type: "string" },
      ttl: { type: "string" },
      purge: { type: "string" },
      token: { type: "string" },
      apply: { type: "boolean", default: false },
      "show-endpoint": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    usage();
    process.exit(0);
  }

  const token = resolveToken(values.token);
  assertToken(token);

  const endpointId = values["endpoint-id"]?.trim();

  let originInput;
  if (values.origin !== undefined) {
    originInput = values.origin;
  } else if (!endpointId) {
    originInput = buildOriginFromSpace(values.space, values.region);
  } else if (values.space !== undefined || values.region !== undefined) {
    if (values.space === undefined || values.region === undefined) {
      console.warn(
        "Ignoring incomplete --space/--region because --endpoint-id was provided.",
      );
    } else {
      originInput = buildOriginFromSpace(values.space, values.region);
    }
  }
  const origin = coerceOrigin(originInput);
  if (!origin && !endpointId) {
    usage();
    throw new Error(
      "An origin is required. Provide --origin, --space with --region, or --endpoint-id.",
    );
  }

  if (values.origin && values.space) {
    console.warn(
      "Both --origin and --space provided. Using --origin and ignoring --space/--region.",
    );
  }

  const ttl = parsePositiveInt(values.ttl ?? "3600", "ttl");
  const customDomain = values["custom-domain"]?.trim();
  const certificateId = values["certificate-id"]?.trim();
  const purge = values.purge
    ? values.purge.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const endpoints = await listEndpoints(token);
  const existing = ensureEndpointMatch(endpoints, {
    endpointId,
    origin: origin || undefined,
    customDomain,
  });

  const resolvedOrigin = origin || existing?.origin || "";
  if (!resolvedOrigin) {
    usage();
    throw new Error(
      "Unable to determine origin. Provide --origin, --space with --region, or ensure the endpoint exists.",
    );
  }

  if (!origin && existing?.origin) {
    console.log(
      `Reusing origin ${existing.origin} from endpoint ${existing.id}.`,
    );
  }

  if (endpointId && !existing) {
    console.warn(
      `Endpoint with id=${endpointId} not found. A new endpoint will be created.`,
    );
  } else if (origin && existing && existing.origin !== origin) {
    console.warn(
      `Existing endpoint origin (${existing.origin}) differs from desired ${origin}. Origins cannot be changed. A new endpoint will be created.`,
    );
  }

  const canUpdate = existing && existing.origin === resolvedOrigin;

  const desired = {
    origin: resolvedOrigin,
    ttl,
    custom_domain: customDomain,
    certificate_id: certificateId,
  };

  console.log("Desired CDN configuration:");
  console.log(JSON.stringify(desired, null, 2));

  if (existing) {
    console.log(`\nMatched endpoint: ${describeEndpoint(existing)}`);
  } else {
    console.log("\nNo existing endpoint matched the provided criteria.");
  }

  if (!values.apply) {
    if (!existing) {
      console.log(
        "\nDry run complete. Re-run with --apply to create the endpoint.",
      );
    } else if (canUpdate) {
      const { changes } = computeUpdates(existing, {
        ttl: desired.ttl,
        custom_domain: desired.custom_domain,
        certificate_id: desired.certificate_id,
      });
      if (changes.length === 0 && purge.length === 0) {
        console.log("\nNo changes detected.");
      } else {
        console.log("\nPending changes:");
        for (const change of changes) {
          console.log(`  - ${change}`);
        }
        if (purge.length > 0) {
          console.log(`  - Purge paths: ${purge.join(", ")}`);
        }
        console.log(
          "\nDry run complete. Re-run with --apply to apply the changes.",
        );
      }
    } else {
      console.log(
        "\nDry run complete. Re-run with --apply to create a new endpoint.",
      );
    }
    return;
  }

  let endpoint = existing;
  if (!existing || !canUpdate) {
    console.log("\nCreating CDN endpoint...");
    const body = {
      origin: desired.origin,
      ttl: desired.ttl,
    };
    if (desired.custom_domain !== undefined) {
      body.custom_domain = desired.custom_domain;
    }
    if (desired.certificate_id !== undefined) {
      body.certificate_id = desired.certificate_id;
    }
    const created = await apiRequest("/cdn/endpoints", token, {
      method: "POST",
      body,
    });
    endpoint = created?.endpoint ?? created;
    if (!endpoint) {
      throw new Error("DigitalOcean API did not return the created endpoint.");
    }
    console.log(`Created endpoint id=${endpoint.id} (${endpoint.endpoint}).`);
  } else {
    const { updates, changes } = computeUpdates(existing, {
      ttl: desired.ttl,
      custom_domain: desired.custom_domain,
      certificate_id: desired.certificate_id,
    });
    if (Object.keys(updates).length > 0) {
      console.log("\nUpdating CDN endpoint...");
      const updated = await apiRequest(`/cdn/endpoints/${existing.id}`, token, {
        method: "PUT",
        body: updates,
      });
      endpoint = updated?.endpoint ?? updated;
      console.log("Applied updates:");
      for (const change of changes) {
        console.log(`  - ${change}`);
      }
    } else {
      console.log("\nNo endpoint property changes required.");
    }
  }

  if (purge.length > 0) {
    const targetId = endpoint?.id ?? existing?.id;
    if (!targetId) {
      throw new Error("Unable to determine endpoint id for cache purge.");
    }
    console.log(`\nPurging CDN cache for ${purge.join(", ")}...`);
    await purgeCache(targetId, token, purge);
    console.log("Purge request submitted.");
  }

  if (values["show-endpoint"]) {
    const finalEndpoints = await listEndpoints(token);
    const final = ensureEndpointMatch(finalEndpoints, {
      endpointId: endpoint?.id,
      origin: resolvedOrigin,
      customDomain,
    });
    if (final) {
      console.log("\nResolved endpoint state:");
      console.log(JSON.stringify(final, null, 2));
    } else {
      console.warn("\nUnable to locate endpoint after applying changes.");
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
