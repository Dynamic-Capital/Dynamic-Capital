import { URL } from 'node:url';

export const PRODUCTION_ALLOWED_ORIGINS = [
  'https://dynamic-capital.ondigitalocean.app',
  'https://dynamic-capital.vercel.app',
  'https://dynamic-capital.lovable.app',
];

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeOrigin(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function parseAllowedOrigins(value) {
  return value
    .split(',')
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

  return Array.from(new Set(baseList)).join(',');
}

function formatChangeLabel(key, value, context) {
  if (context && context.length > 0) {
    return `${context}: ${key} → ${value}`;
  }
  return `${key} → ${value}`;
}

function upsertEnv(envs, key, value, scope, changes, context) {
  const entry = envs.find((item) => item?.key === key);
  const changeLabel = formatChangeLabel(key, value, context);
  if (entry) {
    if (entry.value !== value) {
      changes.add(changeLabel);
    }
    entry.value = value;
    if (!entry.scope) {
      entry.scope = scope;
    }
  } else {
    envs.push({ key, value, scope });
    changes.add(changeLabel);
  }
}

function parseSiteUrl(siteUrl) {
  try {
    return new URL(siteUrl);
  } catch (error) {
    throw new Error(`Invalid site URL: ${siteUrl}. ${error instanceof Error ? error.message : ''}`);
  }
}

export function normalizeAppSpec({
  spec: inputSpec,
  siteUrl,
  domain,
  zone,
  serviceName = 'dynamic-capital',
  allowedOriginsOverride,
}) {
  if (!inputSpec || typeof inputSpec !== 'object') {
    throw new Error('Unexpected spec format received. Expected an object.');
  }
  if (!siteUrl) {
    throw new Error('siteUrl is required.');
  }

  const parsedSiteUrl = parseSiteUrl(siteUrl);
  const canonicalSiteUrl = parsedSiteUrl.toString().replace(/\/$/, '');
  const canonicalOrigin = parsedSiteUrl.origin;
  const finalDomain = domain ?? parsedSiteUrl.host;
  const finalZone = zone ?? finalDomain;

  const spec = inputSpec;
  const changes = new Set();

  spec.envs = ensureArray(spec.envs);
  const existingAllowedOrigins = spec.envs.find((item) => item?.key === 'ALLOWED_ORIGINS')?.value;
  const allowedOrigins = resolveAllowedOrigins({
    requested: allowedOriginsOverride,
    existing: existingAllowedOrigins,
    canonicalOrigin,
  });

  const globalContext = 'app env';
  upsertEnv(spec.envs, 'SITE_URL', canonicalSiteUrl, 'RUN_AND_BUILD_TIME', changes, globalContext);
  upsertEnv(spec.envs, 'NEXT_PUBLIC_SITE_URL', canonicalSiteUrl, 'RUN_AND_BUILD_TIME', changes, globalContext);
  upsertEnv(spec.envs, 'ALLOWED_ORIGINS', allowedOrigins, 'RUN_AND_BUILD_TIME', changes, globalContext);
  upsertEnv(spec.envs, 'MINIAPP_ORIGIN', canonicalOrigin, 'RUN_AND_BUILD_TIME', changes, globalContext);

  function updateComponentEnvs(components, { includeAllowedOrigins = false, label }) {
    const list = ensureArray(components);
    for (const component of list) {
      if (!component || typeof component !== 'object') {
        continue;
      }
      component.envs = ensureArray(component.envs);
      const componentContext = component.name ? `${label} '${component.name}'` : label;
      upsertEnv(component.envs, 'SITE_URL', canonicalSiteUrl, 'RUN_AND_BUILD_TIME', changes, componentContext);
      upsertEnv(component.envs, 'NEXT_PUBLIC_SITE_URL', canonicalSiteUrl, 'RUN_AND_BUILD_TIME', changes, componentContext);
      if (includeAllowedOrigins) {
        upsertEnv(component.envs, 'ALLOWED_ORIGINS', allowedOrigins, 'RUN_AND_BUILD_TIME', changes, componentContext);
      }
      upsertEnv(component.envs, 'MINIAPP_ORIGIN', canonicalOrigin, 'RUN_AND_BUILD_TIME', changes, componentContext);
    }
    return list;
  }

  spec.services = ensureArray(spec.services);
  const service = spec.services.find((svc) => svc && typeof svc === 'object' && svc.name === serviceName);
  if (service) {
    updateComponentEnvs([service], { label: 'service' });
  } else if (spec.services.length > 0) {
    console.warn(`Warning: Service '${serviceName}' not found. Updating all services instead.`);
    updateComponentEnvs(spec.services, { label: 'service' });
  } else {
    console.warn('Warning: No services defined in the app spec. Only global env vars were updated.');
  }

  spec.static_sites = updateComponentEnvs(spec.static_sites, { includeAllowedOrigins: true, label: 'static site' });
  spec.workers = updateComponentEnvs(spec.workers, { label: 'worker' });
  spec.jobs = updateComponentEnvs(spec.jobs, { label: 'job' });
  spec.functions = updateComponentEnvs(spec.functions, { label: 'function' });

  if (spec.ingress && typeof spec.ingress === 'object') {
    spec.ingress.rules = ensureArray(spec.ingress.rules);
    for (const rule of spec.ingress.rules) {
      if (rule && typeof rule === 'object' && rule.match && typeof rule.match === 'object' && rule.match.authority) {
        const authority = rule.match.authority;
        if (authority.exact !== finalDomain) {
          authority.exact = finalDomain;
          changes.add(`ingress authority exact → ${finalDomain}`);
        }
      }
    }
  }

  spec.domains = ensureArray(spec.domains);
  if (spec.domains.length === 0) {
    spec.domains.push({ domain: finalDomain, type: 'PRIMARY', wildcard: false, zone: finalZone });
    changes.add(`domains[0] set to ${finalDomain} (zone: ${finalZone})`);
  } else {
    const primary = spec.domains.find((item) => item && item.type === 'PRIMARY') ?? spec.domains[0];
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

  return {
    spec,
    canonicalSiteUrl,
    canonicalOrigin,
    domain: finalDomain,
    zone: finalZone,
    allowedOrigins,
    changes: Array.from(changes),
  };
}
