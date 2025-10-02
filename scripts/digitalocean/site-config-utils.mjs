import { URL } from "node:url";

import { PRODUCTION_ALLOWED_ORIGINS } from "../utils/allowed-origins.mjs";

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
    canonicalOrigin,
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
        canonicalOrigin,
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

  if (spec.ingress && typeof spec.ingress === "object") {
    spec.ingress.rules = ensureArray(spec.ingress.rules);
    let hasCanonicalRule = false;

    for (const rule of spec.ingress.rules) {
      if (
        rule && typeof rule === "object" && rule.match &&
        typeof rule.match === "object" && rule.match.authority
      ) {
        const authority = rule.match.authority;
        const rawExact = typeof authority.exact === "string"
          ? authority.exact.trim()
          : undefined;

        if (rawExact) {
          const lowerExact = rawExact.toLowerCase();
          if (lowerExact === canonicalDomainLower) {
            hasCanonicalRule = true;
            continue;
          }

          if (knownDomains.has(lowerExact)) {
            continue;
          }
        }

        authority.exact = finalDomain;
        hasCanonicalRule = true;
        changes.add(`ingress authority exact → ${finalDomain}`);
      }
    }

    if (!hasCanonicalRule) {
      spec.ingress.rules.unshift({
        component: { name: serviceName },
        match: {
          authority: { exact: finalDomain },
          path: { prefix: "/" },
        },
      });
      changes.add(
        `ingress rule added for ${finalDomain} → service '${serviceName}'`,
      );
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
