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
    `  --app-id <id>             DigitalOcean App Platform app ID (required)\n` +
    `  --site-url <url>         Canonical site URL to enforce (required)\n` +
    `  --domain <host>          Override the hostname portion of the site URL\n` +
    `  --zone <domain>          DNS zone to import (defaults to domain)\n` +
    `  --service <name>         Service name to update (default: dynamic-capital)\n` +
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

function upsertEnv(envs, key, value, scope, changes) {
  const entry = envs.find((item) => item?.key === key);
  if (entry) {
    if (entry.value !== value) {
      changes.add(`${key} → ${value}`);
    }
    entry.value = value;
    if (!entry.scope) {
      entry.scope = scope;
    }
  } else {
    envs.push({ key, value, scope });
    changes.add(`${key} → ${value}`);
  }
}

class DoctlError extends Error {
  constructor(message, stderr, code) {
    super(message);
    this.stderr = stderr;
    this.code = code;
  }
}

async function runDoctl(args, { inherit = false } = {}) {
  return await new Promise((resolve, reject) => {
    const stdio = inherit ? ['inherit', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'];
    const child = spawn('doctl', args, { stdio });
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
        reject(new DoctlError(`doctl ${args.join(' ')} exited with code ${code}.`, stderr, code));
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
      domain: { type: 'string' },
      zone: { type: 'string' },
      service: { type: 'string', default: 'dynamic-capital' },
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

  if (!appId) {
    usage();
    throw new Error('--app-id is required. Use `doctl apps list` to locate the UUID.');
  }

  if (!siteUrl) {
    usage();
    throw new Error('--site-url is required (e.g. https://dynamic-capital.lovable.app).');
  }

  const parsedSiteUrl = parseSiteUrl(siteUrl);
  const domain = values.domain ?? parsedSiteUrl.host;
  const zone = values.zone ?? domain;
  const serviceName = values.service ?? 'dynamic-capital';

  let specOutput;
  try {
    specOutput = await runDoctl(['apps', 'spec', 'get', appId]);
  } catch (error) {
    if (error instanceof DoctlError && error.stderr) {
      console.error(error.stderr.trim());
    }
    throw error;
  }

  const parsedSpec = YAML.parse(specOutput.stdout);
  const spec = (parsedSpec && typeof parsedSpec === 'object' && parsedSpec.spec)
    ? parsedSpec.spec
    : parsedSpec;

  if (!spec || typeof spec !== 'object') {
    throw new Error('Unexpected spec format received from doctl.');
  }

  const changes = new Set();

  spec.envs = ensureArray(spec.envs);
  upsertEnv(spec.envs, 'SITE_URL', parsedSiteUrl.toString(), 'RUN_AND_BUILD_TIME', changes);
  upsertEnv(spec.envs, 'NEXT_PUBLIC_SITE_URL', parsedSiteUrl.toString(), 'RUN_AND_BUILD_TIME', changes);
  upsertEnv(spec.envs, 'ALLOWED_ORIGINS', parsedSiteUrl.toString(), 'RUN_AND_BUILD_TIME', changes);
  upsertEnv(spec.envs, 'MINIAPP_ORIGIN', parsedSiteUrl.toString(), 'RUN_AND_BUILD_TIME', changes);

  spec.services = ensureArray(spec.services);
  const service = spec.services.find((svc) => svc && typeof svc === 'object' && svc.name === serviceName);
  if (service) {
    service.envs = ensureArray(service.envs);
    upsertEnv(service.envs, 'SITE_URL', parsedSiteUrl.toString(), 'RUN_AND_BUILD_TIME', changes);
    upsertEnv(service.envs, 'NEXT_PUBLIC_SITE_URL', parsedSiteUrl.toString(), 'RUN_AND_BUILD_TIME', changes);
    upsertEnv(service.envs, 'MINIAPP_ORIGIN', parsedSiteUrl.toString(), 'RUN_AND_BUILD_TIME', changes);
  } else {
    console.warn(`Warning: Service '${serviceName}' not found in the app spec. Only global env vars were updated.`);
  }

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

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output);
    await fs.writeFile(outputPath, rendered, 'utf8');
    console.log(`Updated spec written to ${outputPath}.`);
  }

  if (values['show-spec']) {
    console.log('\n----- Updated spec preview -----\n');
    console.log(rendered);
    console.log('----- End preview -----\n');
  }

  console.log('DigitalOcean app configuration summary:');
  console.log(`  App ID: ${appId}`);
  console.log(`  Service: ${serviceName}`);
  console.log(`  Site URL: ${parsedSiteUrl.toString()}`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Zone: ${zone}`);

  if (changes.size > 0) {
    console.log('  Applied updates:');
    for (const change of changes) {
      console.log(`    - ${change}`);
    }
  } else {
    console.log('  No changes detected; the spec already matched the requested configuration.');
  }

  if (values.apply) {
    const tmpBase = await fs.mkdtemp(path.join(tmpdir(), 'doctl-app-spec-'));
    const tempFile = path.join(tmpBase, 'app-spec.yml');
    await fs.writeFile(tempFile, rendered, 'utf8');
    console.log(`\nApplying spec update via doctl (temporary file: ${tempFile})...`);
    try {
      await runDoctl(['apps', 'spec', 'update', appId, '--spec', tempFile], { inherit: true });
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
    await runDoctl(['compute', 'domain', 'records', 'import', zone, '--zone-file', zoneFile], { inherit: true });
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
