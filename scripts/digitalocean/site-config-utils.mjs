import { URL } from "node:url";

export const PRIMARY_PRODUCTION_ORIGIN = "https://dynamic.capital";
export const TON_ALIAS_ORIGIN = "https://dynamiccapital.ton";
export const DIGITALOCEAN_ACTIVE_ORIGIN =
  "https://dynamic-capital-qazf2.ondigitalocean.app";
export const DIGITALOCEAN_LEGACY_ORIGIN =
  "https://dynamic-capital.ondigitalocean.app";
export const TELEGRAM_WEB_APP_ORIGIN = "https://t.me";

function safeParseHost(origin) {
  if (!origin) return undefined;
  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
}

function inferZoneFromHost(hostname) {
  if (!hostname) return undefined;
  const segments = hostname.split(".").filter(Boolean);
  if (segments.length <= 1) {
    return hostname;
  }
  return segments.slice(1).join(".");
}

const DIGITALOCEAN_ACTIVE_HOST = safeParseHost(DIGITALOCEAN_ACTIVE_ORIGIN);
const DIGITALOCEAN_LEGACY_HOST = safeParseHost(DIGITALOCEAN_LEGACY_ORIGIN);

export const PRODUCTION_ALLOWED_ORIGINS = [
  TON_ALIAS_ORIGIN,
  "https://www.dynamiccapital.ton",
  PRIMARY_PRODUCTION_ORIGIN,
  DIGITALOCEAN_ACTIVE_ORIGIN,
  DIGITALOCEAN_LEGACY_ORIGIN,
  "https://dynamic-capital-git-dynamic-capital-a2ae79-the-project-archive.vercel.app",
  "https://dynamic-capital-kp5fqeegn-the-project-archive.vercel.app",
  "https://dynamic-capital.vercel.app",
  "https://dynamic-capital.lovable.app",
  TELEGRAM_WEB_APP_ORIGIN,
];

const DEFAULT_DOMAIN_ALIASES = [
  DIGITALOCEAN_ACTIVE_HOST
    ? {
      domain: DIGITALOCEAN_ACTIVE_HOST,
      zone: inferZoneFromHost(DIGITALOCEAN_ACTIVE_HOST),
      type: "ALIAS",
    }
    : undefined,
  DIGITALOCEAN_LEGACY_HOST
    ? {
      domain: DIGITALOCEAN_LEGACY_HOST,
      zone: inferZoneFromHost(DIGITALOCEAN_LEGACY_HOST),
      type: "ALIAS",
    }
    : undefined,
].filter(Boolean);

const DEFAULT_HEALTH_CHECK_PATH = "/healthz";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeOrigin(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function parseAllowedOrigins(value) {
  return value
    .split(",")
    .map(normalizeOrigin)
    .filter((origin) => origin.length > 0);
}

function resolveAllowedOrigins({ requested, existing, canonicalOrigin }) {
  const baseList = requested
    ? parseAllowedOrigins(requested)
    : existing
    ? parseAllowedOrigins(existing)
    : [...PRODUCTION_ALLOWED_ORIGINS];

  if (!baseList.includes(canonicalOrigin)) {
    baseList.push(canonicalOrigin);
  }

  return Array.from(new Set(baseList)).join(",");
}

function formatChangeLabel(key, value, context) {
  if (context && context.length > 0) {
    return `${context}: ${key} → ${value}`;
  }
  return `${key} → ${value}`;
}

function formatScopeChangeLabel(key, previous, next, context) {
  const detail = `${key} scope ${previous ?? "unset"} → ${next}`;
  if (context && context.length > 0) {
    return `${context}: ${detail}`;
  }
  return detail;
}

function ensureDomainRecord(domains, alias, changes) {
  if (!alias || typeof alias.domain !== "string") {
    return;
  }

  const normalizedDomain = alias.domain.trim();
  if (!normalizedDomain) {
    return;
  }

  const domainContext = `domain '${normalizedDomain}'`;
  const existing = domains.find((item) =>
    typeof item?.domain === "string" &&
    item.domain.trim().toLowerCase() === normalizedDomain.toLowerCase()
  );

  if (!existing) {
    const record = {
      domain: normalizedDomain,
      type: alias.type ?? "ALIAS",
      wildcard: alias.wildcard ?? false,
    };
    if (alias.zone) {
      record.zone = alias.zone;
    }
    domains.push(record);
    changes.add(`${domainContext} added (${record.type})`);
    if (record.zone) {
      changes.add(`${domainContext} zone → ${record.zone}`);
    }
    return;
  }

  if (alias.type && existing.type !== alias.type) {
    existing.type = alias.type;
    changes.add(`${domainContext} type → ${alias.type}`);
  }

  if (alias.zone && existing.zone !== alias.zone) {
    existing.zone = alias.zone;
    changes.add(`${domainContext} zone → ${alias.zone}`);
  }

  if (existing.wildcard === undefined) {
    existing.wildcard = alias.wildcard ?? false;
    changes.add(`${domainContext} wildcard → ${existing.wildcard}`);
  }
}

function ensureIngressRule({
  rules,
  host,
  serviceName,
  changes,
  presentHosts,
}) {
  if (!host) {
    return;
  }

  const normalizedHost = host.trim();
  if (!normalizedHost) {
    return;
  }

  const lowerHost = normalizedHost.toLowerCase();
  const existing = rules.find((entry) =>
    entry && typeof entry === "object" &&
    typeof entry.match === "object" &&
    typeof entry.match?.authority === "object" &&
    typeof entry.match.authority?.exact === "string" &&
    entry.match.authority.exact.trim().toLowerCase() === lowerHost
  );

  if (existing) {
    if (!existing.component || existing.component.name !== serviceName) {
      existing.component = { name: serviceName };
      changes.add(
        `ingress component → service '${serviceName}' (${normalizedHost})`,
      );
    }

    if (!existing.match.path || existing.match.path.prefix !== "/") {
      existing.match.path = { prefix: "/" };
      changes.add(`ingress path prefix → / (${normalizedHost})`);
    }

    if (existing.match.authority.exact !== normalizedHost) {
      existing.match.authority.exact = normalizedHost;
      changes.add(`ingress authority exact → ${normalizedHost}`);
    }

    presentHosts.add(lowerHost);
    return;
  }

  rules.push({
    component: { name: serviceName },
    match: {
      authority: { exact: normalizedHost },
      path: { prefix: "/" },
    },
  });
  presentHosts.add(lowerHost);
  changes.add(
    `ingress rule added for ${normalizedHost} → service '${serviceName}'`,
  );
}

function upsertEnv(envs, key, value, scope, changes, context) {
  const entry = envs.find((item) => item?.key === key);
  const changeLabel = formatChangeLabel(key, value, context);
  if (entry) {
    if (value !== undefined && entry.value !== value) {
      changes.add(changeLabel);
      entry.value = value;
    }
    if (entry.scope !== scope) {
      changes.add(formatScopeChangeLabel(key, entry.scope, scope, context));
      entry.scope = scope;
    }
  } else {
    const nextEntry = { key, scope };
    if (value !== undefined) {
      nextEntry.value = value;
    }
    envs.push(nextEntry);
    changes.add(changeLabel);
    changes.add(formatScopeChangeLabel(key, undefined, scope, context));
  }
}

function ensureEnvScope(envs, key, scope, changes, context) {
  const entry = envs.find((item) => item?.key === key);
  if (!entry) {
    return;
  }
  if (entry.scope !== scope) {
    changes.add(formatScopeChangeLabel(key, entry.scope, scope, context));
    entry.scope = scope;
  }
}

function ensureHealthCheckHttpPath(component, httpPath, changes, context) {
  if (!component || typeof component !== "object") {
    return;
  }

  const label = context && context.length > 0
    ? `${context}: health_check.http_path → ${httpPath}`
    : `health_check.http_path → ${httpPath}`;

  if (!component.health_check || typeof component.health_check !== "object") {
    component.health_check = { http_path: httpPath };
    changes.add(label);
    return;
  }

  if (component.health_check.http_path !== httpPath) {
    component.health_check.http_path = httpPath;
    changes.add(label);
  }
}

function parseSiteUrl(siteUrl) {
  try {
    return new URL(siteUrl);
  } catch (error) {
    throw new Error(
      `Invalid site URL: ${siteUrl}. ${
        error instanceof Error ? error.message : ""
      }`,
    );
  }
}

export function normalizeAppSpec({
  spec: inputSpec,
  siteUrl,
  domain,
  zone,
  serviceName = "dynamic-capital",
  allowedOriginsOverride,
}) {
  if (!inputSpec || typeof inputSpec !== "object") {
    throw new Error("Unexpected spec format received. Expected an object.");
  }
  if (!siteUrl) {
    throw new Error("siteUrl is required.");
  }

  const parsedSiteUrl = parseSiteUrl(siteUrl);
  const canonicalSiteUrl = parsedSiteUrl.toString().replace(/\/$/, "");
  const canonicalOrigin = parsedSiteUrl.origin;
  const miniappOrigins = Array.from(
    new Set([canonicalOrigin, TON_ALIAS_ORIGIN, TELEGRAM_WEB_APP_ORIGIN]),
  ).join(",");
  const canonicalWebhookUrl = new URL("/webhook", canonicalOrigin).toString();
  const finalDomain = domain ?? parsedSiteUrl.host;
  const finalZone = zone ?? finalDomain;

  const spec = inputSpec;
  const changes = new Set();

  spec.envs = ensureArray(spec.envs);
  const existingAllowedOrigins = spec.envs.find((item) =>
    item?.key === "ALLOWED_ORIGINS"
  )?.value;
  const allowedOrigins = resolveAllowedOrigins({
    requested: allowedOriginsOverride,
    existing: existingAllowedOrigins,
    canonicalOrigin,
  });

  const globalContext = "app env";
  upsertEnv(
    spec.envs,
    "SITE_URL",
    canonicalSiteUrl,
    "RUN_AND_BUILD_TIME",
    changes,
    globalContext,
  );
  upsertEnv(
    spec.envs,
    "NEXT_PUBLIC_SITE_URL",
    canonicalSiteUrl,
    "RUN_AND_BUILD_TIME",
    changes,
    globalContext,
  );
  upsertEnv(
    spec.envs,
    "ALLOWED_ORIGINS",
    allowedOrigins,
    "RUN_AND_BUILD_TIME",
    changes,
    globalContext,
  );
  upsertEnv(
    spec.envs,
    "MINIAPP_ORIGIN",
    miniappOrigins,
    "RUN_AND_BUILD_TIME",
    changes,
    globalContext,
  );
  upsertEnv(
    spec.envs,
    "TELEGRAM_WEBHOOK_URL",
    canonicalWebhookUrl,
    "RUN_AND_BUILD_TIME",
    changes,
    globalContext,
  );

  const buildCredentialKeys = [
    "CDN_BUCKET",
    "CDN_REGION",
    "CDN_ACCESS_KEY",
    "CDN_SECRET_KEY",
  ];
  for (const key of buildCredentialKeys) {
    ensureEnvScope(
      spec.envs,
      key,
      "RUN_AND_BUILD_TIME",
      changes,
      globalContext,
    );
  }

  function updateComponentEnvs(
    components,
    { includeAllowedOrigins = false, label },
  ) {
    const list = ensureArray(components);
    for (const component of list) {
      if (!component || typeof component !== "object") {
        continue;
      }
      component.envs = ensureArray(component.envs);
      const componentContext = component.name
        ? `${label} '${component.name}'`
        : label;
      upsertEnv(
        component.envs,
        "SITE_URL",
        canonicalSiteUrl,
        "RUN_AND_BUILD_TIME",
        changes,
        componentContext,
      );
      upsertEnv(
        component.envs,
        "NEXT_PUBLIC_SITE_URL",
        canonicalSiteUrl,
        "RUN_AND_BUILD_TIME",
        changes,
        componentContext,
      );
      if (includeAllowedOrigins) {
        upsertEnv(
          component.envs,
          "ALLOWED_ORIGINS",
          allowedOrigins,
          "RUN_AND_BUILD_TIME",
          changes,
          componentContext,
        );
      }
      upsertEnv(
        component.envs,
        "MINIAPP_ORIGIN",
        miniappOrigins,
        "RUN_AND_BUILD_TIME",
        changes,
        componentContext,
      );
      upsertEnv(
        component.envs,
        "TELEGRAM_WEBHOOK_URL",
        canonicalWebhookUrl,
        "RUN_AND_BUILD_TIME",
        changes,
        componentContext,
      );
    }
    return list;
  }

  spec.services = ensureArray(spec.services);
  const service = spec.services.find((svc) =>
    svc && typeof svc === "object" && svc.name === serviceName
  );

  let targetedServices = [];
  if (service) {
    targetedServices = updateComponentEnvs([service], { label: "service" });
  } else if (spec.services.length > 0) {
    console.warn(
      `Warning: Service '${serviceName}' not found. Updating all services instead.`,
    );
    targetedServices = updateComponentEnvs(spec.services, { label: "service" });
  } else {
    console.warn(
      "Warning: No services defined in the app spec. Only global env vars were updated.",
    );
  }

  for (const component of targetedServices) {
    const context = component?.name ? `service '${component.name}'` : "service";
    ensureHealthCheckHttpPath(
      component,
      DEFAULT_HEALTH_CHECK_PATH,
      changes,
      context,
    );
  }

  spec.static_sites = updateComponentEnvs(spec.static_sites, {
    includeAllowedOrigins: true,
    label: "static site",
  });
  spec.workers = updateComponentEnvs(spec.workers, { label: "worker" });
  spec.jobs = updateComponentEnvs(spec.jobs, { label: "job" });
  spec.functions = updateComponentEnvs(spec.functions, { label: "function" });

  spec.domains = ensureArray(spec.domains);
  if (spec.domains.length === 0) {
    spec.domains.push({
      domain: finalDomain,
      type: "PRIMARY",
      wildcard: false,
      zone: finalZone,
    });
    changes.add(`domains[0] set to ${finalDomain} (zone: ${finalZone})`);
  } else {
    const primary = spec.domains.find((item) =>
      item && item.type === "PRIMARY"
    ) ?? spec.domains[0];
    if (primary.domain !== finalDomain) {
      primary.domain = finalDomain;
      changes.add(`primary domain → ${finalDomain}`);
    }
    if (primary.zone !== finalZone) {
      primary.zone = finalZone;
      changes.add(`primary zone → ${finalZone}`);
    }
    if (primary.wildcard === undefined) {
      primary.wildcard = false;
    }
  }

  for (const alias of DEFAULT_DOMAIN_ALIASES) {
    if (!alias) {
      continue;
    }
    if (alias.domain.toLowerCase() === finalDomain.toLowerCase()) {
      continue;
    }
    ensureDomainRecord(spec.domains, alias, changes);
  }

  const canonicalDomainLower = finalDomain.toLowerCase();
  const knownDomains = new Set(
    spec.domains
      .map((item) =>
        typeof item?.domain === "string"
          ? item.domain.trim().toLowerCase()
          : undefined
      )
      .filter(Boolean),
  );
  knownDomains.add(canonicalDomainLower);

  const aliasHosts = DEFAULT_DOMAIN_ALIASES
    .map((alias) => alias?.domain?.toLowerCase())
    .filter((host) => host && host !== canonicalDomainLower);
  for (const host of aliasHosts) {
    knownDomains.add(host);
  }

  if (!spec.ingress || typeof spec.ingress !== "object") {
    spec.ingress = {};
  }

  spec.ingress.rules = ensureArray(spec.ingress.rules);
  const requiredHosts = new Map([[canonicalDomainLower, finalDomain]]);
  for (const alias of DEFAULT_DOMAIN_ALIASES) {
    if (!alias?.domain) {
      continue;
    }
    const lower = alias.domain.toLowerCase();
    if (lower === canonicalDomainLower) {
      continue;
    }
    requiredHosts.set(lower, alias.domain);
  }

  const presentIngressHosts = new Set();
  for (const [, hostValue] of requiredHosts) {
    ensureIngressRule({
      rules: spec.ingress.rules,
      host: hostValue,
      serviceName,
      changes,
      presentHosts: presentIngressHosts,
    });
  }

  for (const rule of spec.ingress.rules) {
    if (
      !rule || typeof rule !== "object" || !rule.match ||
      typeof rule.match !== "object"
    ) {
      continue;
    }

    const authority = rule.match.authority;
    if (!authority || typeof authority !== "object") {
      continue;
    }

    const rawExact = typeof authority.exact === "string"
      ? authority.exact.trim()
      : undefined;
    if (!rawExact) {
      continue;
    }

    const lowerExact = rawExact.toLowerCase();
    if (requiredHosts.has(lowerExact)) {
      continue;
    }

    if (!knownDomains.has(lowerExact)) {
      authority.exact = finalDomain;
      changes.add(`ingress authority exact → ${finalDomain}`);
    }
  }

  return {
    spec,
    canonicalSiteUrl,
    canonicalOrigin,
    canonicalWebhookUrl,
    domain: finalDomain,
    zone: finalZone,
    allowedOrigins,
    changes: Array.from(changes),
  };
}
