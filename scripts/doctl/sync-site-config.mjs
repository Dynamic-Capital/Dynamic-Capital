#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promises as fs } from 'node:fs';
import { parseArgs } from 'node:util';
import YAML from 'yaml';

function usage() {
  console.log(`Sync the DigitalOcean App Platform spec and DNS zone records with the desired site URL.\n\n` +
    `Usage:\n  node scripts/doctl/sync-site-config.mjs --app-id <id> --site-url https://example.com [options]\n\n` +
    `Options:\n` +
    `  --app-id <id>             DigitalOcean App Platform app ID (required unless --spec is used)\n` +
    `  --site-url <url>         Canonical site URL to enforce (required)\n` +
    `  --allowed-origins <list> Override the comma-separated CORS allow list\n` +
    `  --domain <host>          Override the hostname portion of the site URL\n` +
    `  --spec <path>           Load an existing app spec from a local YAML file\n` +
    `  --zone <domain>          DNS zone to import (defaults to domain)\n` +
    `  --service <name>         Service name to update (default: dynamic-capital)\n` +
    `  --context <name>        doctl context to use (defaults to active context)\n` +
    `  --zone-file <path>       Zone file to import when --apply-zone is set\n` +
    `  --output <path>          Write the updated spec YAML to a file\n` +
    `  --apply                  Push the updated spec via doctl\n` +
    `  --apply-zone             Import the zone file via doctl compute\n` +
    `  --show-spec              Print the rendered YAML to stdout\n` +
    `  --help                   Display this help message\n`);
}

function parseSiteUrl(value) {
  try {
    return new URL(value);
  } catch (error) {
    throw new Error(`Invalid site URL: ${value}. ${error instanceof Error ? error.message : ''}`);
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

const PRODUCTION_ALLOWED_ORIGINS = [
  'https://dynamic-capital.vercel.app',
  'https://dynamic-capital.lovable.app',
  'https://dynamic-capital.ondigitalocean.app',
];

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

function resolveAllowedOrigins({
  requested,
  existing,
  canonicalOrigin,
}) {
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

class DoctlError extends Error {
  constructor(message, stderr, code) {
    super(message);
    this.stderr = stderr;
    this.code = code;
  }
}

async function runDoctl(args, { inherit = false, context } = {}) {
  return await new Promise((resolve, reject) => {
    const stdio = inherit ? ['inherit', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'];
    const finalArgs = context ? ['--context', context, ...args] : args;
    const child = spawn('doctl', finalArgs, { stdio });
    const stdoutChunks = [];
    const stderrChunks = [];

    if (!inherit && child.stdout) {
      child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    }
    if (!inherit && child.stderr) {
      child.stderr.on('data', (chunk) => stderrChunks.push(chunk));
    }

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('doctl command not found. Install the DigitalOcean CLI and ensure it is on your PATH.'));
      } else {
        reject(error);
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        reject(new DoctlError(`doctl ${finalArgs.join(' ')} exited with code ${code}.`, stderr, code));
        return;
      }

      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });
  });
}

async function ensureZoneFile(zone, explicitPath) {
  const candidate = explicitPath
    ? path.resolve(process.cwd(), explicitPath)
    : path.resolve(process.cwd(), 'dns', `${zone}.zone`);
  try {
    await fs.access(candidate, fs.constants.R_OK);
    return candidate;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to locate zone file. Provide --zone-file explicitly. Last attempt: ${candidate} (${reason}).`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      'app-id': { type: 'string' },
      'site-url': { type: 'string' },
      'allowed-origins': { type: 'string' },
      domain: { type: 'string' },
      zone: { type: 'string' },
      spec: { type: 'string' },
      service: { type: 'string', default: 'dynamic-capital' },
      context: { type: 'string' },
      'zone-file': { type: 'string' },
      output: { type: 'string' },
      apply: { type: 'boolean', default: false },
      'apply-zone': { type: 'boolean', default: false },
      'show-spec': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    usage();
    process.exit(0);
  }

  const appId = values['app-id'];
  const siteUrl = values['site-url'];
  const specPath = values.spec ? path.resolve(process.cwd(), values.spec) : undefined;

  if (!appId && !specPath) {
    usage();
    throw new Error('--app-id is required unless --spec supplies a local app spec.');
  }

  if (!siteUrl) {
    usage();
    throw new Error('--site-url is required (e.g. https://dynamic-capital.vercel.app).');
  }

  const parsedSiteUrl = parseSiteUrl(siteUrl);
  const domain = values.domain ?? parsedSiteUrl.host;
  const zone = values.zone ?? domain;
  const serviceName = values.service ?? 'dynamic-capital';
  const requestedAllowedOrigins = values['allowed-origins'];
  const context = values.context;
  const canonicalSiteUrl = parsedSiteUrl.toString().replace(/\/$/, '');
  const canonicalOrigin = parsedSiteUrl.origin;

  let parsedSpec;
  if (specPath) {
    let fileContents;
    try {
      fileContents = await fs.readFile(specPath, 'utf8');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to read spec file at ${specPath}. ${reason}`);
    }
    parsedSpec = YAML.parse(fileContents);
  } else {
    let specOutput;
    try {
      specOutput = await runDoctl(['apps', 'spec', 'get', appId], { context });
    } catch (error) {
      if (error instanceof DoctlError && error.stderr) {
        console.error(error.stderr.trim());
      }
      throw error;
    }

    parsedSpec = YAML.parse(specOutput.stdout);
  }
  const spec = (parsedSpec && typeof parsedSpec === 'object' && parsedSpec.spec)
    ? parsedSpec.spec
    : parsedSpec;

  if (!spec || typeof spec !== 'object') {
    throw new Error('Unexpected spec format received from doctl.');
  }

  const changes = new Set();

  spec.envs = ensureArray(spec.envs);
  const existingAllowedOrigins = spec.envs.find((item) => item?.key === 'ALLOWED_ORIGINS')?.value;
  const allowedOrigins = resolveAllowedOrigins({
    requested: requestedAllowedOrigins,
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
    console.warn(`Warning: No services defined in the app spec. Only global env vars were updated.`);
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
        if (authority.exact !== domain) {
          authority.exact = domain;
          changes.add(`ingress authority exact → ${domain}`);
        }
      }
    }
  }

  spec.domains = ensureArray(spec.domains);
  if (spec.domains.length === 0) {
    spec.domains.push({ domain, type: 'PRIMARY', wildcard: false, zone });
    changes.add(`domains[0] set to ${domain} (zone: ${zone})`);
  } else {
    const primary = spec.domains.find((item) => item && item.type === 'PRIMARY') ?? spec.domains[0];
    if (primary.domain !== domain) {
      primary.domain = domain;
      changes.add(`primary domain → ${domain}`);
    }
    if (primary.zone !== zone) {
      primary.zone = zone;
      changes.add(`primary zone → ${zone}`);
    }
    if (primary.wildcard === undefined) {
      primary.wildcard = false;
    }
  }

  const rendered = YAML.stringify(parsedSpec, { lineWidth: 0 });

  const outputPath = values.output
    ? path.resolve(process.cwd(), values.output)
    : undefined;

  if (outputPath) {
    await fs.writeFile(outputPath, rendered, 'utf8');
    console.log(`Updated spec written to ${outputPath}.`);
  }

  if (values['show-spec']) {
    console.log('\n----- Updated spec preview -----\n');
    console.log(rendered);
    console.log('----- End preview -----\n');
  }

  console.log('DigitalOcean app configuration summary:');
  if (appId) {
    console.log(`  App ID: ${appId}`);
  } else {
    console.log('  App ID: (not provided; local spec only)');
  }
  console.log(`  Service: ${serviceName}`);
  console.log(`  Site URL: ${canonicalSiteUrl}`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Zone: ${zone}`);
  console.log(`  Allowed origins: ${allowedOrigins}`);
  console.log(`  Miniapp origin: ${canonicalOrigin}`);
  if (specPath) {
    console.log(`  Spec source: ${specPath}`);
    if (!outputPath) {
      console.log('  Output: (dry-run only; pass --output to write the updated spec)');
    }
  } else {
    console.log('  Spec source: DigitalOcean API (doctl apps spec get)');
  }
  if (context) {
    console.log(`  doctl context: ${context}`);
  }

  if (changes.size > 0) {
    console.log('  Applied updates:');
    for (const change of changes) {
      console.log(`    - ${change}`);
    }
  } else {
    console.log('  No changes detected; the spec already matched the requested configuration.');
  }

  if (values.apply) {
    if (!appId) {
      throw new Error('--apply requires --app-id to target the DigitalOcean app.');
    }
    const tmpBase = await fs.mkdtemp(path.join(tmpdir(), 'doctl-app-spec-'));
    const tempFile = path.join(tmpBase, 'app-spec.yml');
    await fs.writeFile(tempFile, rendered, 'utf8');
    console.log(`\nApplying spec update via doctl (temporary file: ${tempFile})...`);
    try {
      await runDoctl(['apps', 'spec', 'update', appId, '--spec', tempFile], { inherit: true, context });
      console.log('✅ App spec updated successfully.');
    } finally {
      await fs.rm(tmpBase, { recursive: true, force: true });
    }
  } else {
    console.log('\nDry run complete. Re-run with --apply to push the spec to DigitalOcean.');
  }

  if (values['apply-zone']) {
    const zoneFile = await ensureZoneFile(zone, values['zone-file']);
    console.log(`\nImporting DNS zone '${zone}' via doctl (zone file: ${zoneFile})...`);
    await runDoctl(['compute', 'domain', 'records', 'import', zone, '--zone-file', zoneFile], { inherit: true, context });
    console.log('✅ DNS zone imported successfully.');
  } else {
    const hint = values['zone-file']
      ? path.resolve(process.cwd(), values['zone-file'])
      : path.resolve(process.cwd(), 'dns', `${zone}.zone`);
    console.log(`\nZone import not requested. Provide --apply-zone to run 'doctl compute domain records import'. Expected zone file: ${hint}.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(error instanceof DoctlError ? error.code ?? 1 : 1);
});
