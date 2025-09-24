import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { z } from 'zod';

export type EnvMap = Record<string, string[]>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, '..', '..');

export const envMapPath = path.join(repoRoot, 'env', 'env.map.json');

const exampleFiles: Record<string, string> = {
  root: '.env.example',
  env: 'env/.env.example',
  web: 'apps/web/.env.example',
  supabase: 'supabase/functions/.env.example',
  bridge: 'trading/bridge/.env.example'
};

const coverageByTarget: Record<string, string[]> = {
  shared: ['env', 'root'],
  supabase: ['env', 'root', 'supabase'],
  'vercel:user-dashboard': ['env', 'web'],
  'vercel:admin-dashboard': ['env', 'web'],
  'do:marketing-site': ['env', 'root'],
  'do:mini-app': ['env', 'root'],
  'bridge:droplet': ['env', 'root', 'bridge'],
  payments: ['env', 'root', 'supabase'],
  telegram: ['env', 'root', 'supabase'],
  ai: ['env', 'root', 'supabase'],
  providers: ['env', 'root']
};

const schemaCoverageByTarget: Record<string, string[]> = {
  'vercel:user-dashboard': ['web'],
  'vercel:admin-dashboard': ['web']
};

export interface ExampleFile {
  id: string;
  path: string;
  keys: Set<string>;
  exists: boolean;
}

export interface SchemaSource {
  id: string;
  keys: Set<string>;
  loaded: boolean;
  error?: string;
}

export interface TargetStatus {
  target: string;
  required: string[];
  coverageIds: string[];
  schemaIds: string[];
  missingInExamples: string[];
  missingInSchemas: string[];
}

function parseMap(raw: unknown): EnvMap {
  const schema = z.record(z.array(z.string().min(1)));
  const parsed = schema.parse(raw);
  const out: EnvMap = {};
  for (const [target, values] of Object.entries(parsed)) {
    const unique = Array.from(new Set(values));
    out[target] = unique;
  }
  return out;
}

export async function readEnvMap(): Promise<EnvMap> {
  const content = await fs.readFile(envMapPath, 'utf8');
  const json = JSON.parse(content) as unknown;
  return parseMap(json);
}

export function coverageForTarget(target: string): string[] {
  return coverageByTarget[target] ?? ['env', 'root'];
}

export function schemaCoverageForTarget(target: string): string[] {
  return schemaCoverageByTarget[target] ?? [];
}

function parseEnvExample(raw: string): Set<string> {
  const keys = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z0-9_]+)\s*=/.exec(trimmed);
    if (match) keys.add(match[1]);
  }
  return keys;
}

export async function loadExampleFiles(): Promise<Map<string, ExampleFile>> {
  const results = new Map<string, ExampleFile>();
  await Promise.all(
    Object.entries(exampleFiles).map(async ([id, relativePath]) => {
      const abs = path.join(repoRoot, relativePath);
      try {
        const content = await fs.readFile(abs, 'utf8');
        results.set(id, { id, path: abs, keys: parseEnvExample(content), exists: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          results.set(id, { id, path: abs, keys: new Set(), exists: false });
        } else {
          throw error;
        }
      }
    })
  );
  return results;
}

async function loadWebSchemaKeys(): Promise<Set<string>> {
  const previous = process.env.SKIP_RUNTIME_ENV_VALIDATION;
  process.env.SKIP_RUNTIME_ENV_VALIDATION = 'true';
  try {
    const moduleUrl = pathToFileURL(path.join(repoRoot, 'apps/web/lib/env.ts')).href;
    const mod = await import(moduleUrl);
    const schema = mod.EnvSchema as unknown;
    if (schema && schema instanceof z.ZodObject) {
      return new Set(Object.keys(schema.shape));
    }
    return new Set<string>();
  } catch (error) {
    throw new Error(`Failed to load apps/web/lib/env.ts: ${(error as Error).message}`);
  } finally {
    if (previous === undefined) {
      delete process.env.SKIP_RUNTIME_ENV_VALIDATION;
    } else {
      process.env.SKIP_RUNTIME_ENV_VALIDATION = previous;
    }
  }
}

const schemaLoaders: Record<string, () => Promise<Set<string>>> = {
  web: loadWebSchemaKeys
};

export async function loadSchemaSources(): Promise<Map<string, SchemaSource>> {
  const entries = new Map<string, SchemaSource>();
  await Promise.all(
    Object.entries(schemaLoaders).map(async ([id, loader]) => {
      try {
        const keys = await loader();
        entries.set(id, { id, keys, loaded: true });
      } catch (error) {
        entries.set(id, {
          id,
          keys: new Set<string>(),
          loaded: false,
          error: (error as Error).message
        });
      }
    })
  );
  return entries;
}

export function computeTargetStatuses(
  envMap: EnvMap,
  examples: Map<string, ExampleFile>,
  schemas: Map<string, SchemaSource>
): TargetStatus[] {
  const statuses: TargetStatus[] = [];
  for (const [target, required] of Object.entries(envMap)) {
    const coverageIds = coverageForTarget(target);
    const schemaIds = schemaCoverageForTarget(target);
    const exampleSets = coverageIds.map((id) => examples.get(id)?.keys ?? new Set<string>());
    const schemaSets = schemaIds.map((id) => schemas.get(id)?.keys ?? new Set<string>());

    const missingInExamples: string[] = [];
    const missingInSchemas: string[] = [];

    for (const name of required) {
      const presentInExamples = exampleSets.some((set) => set.has(name));
      if (!presentInExamples) {
        missingInExamples.push(name);
      }
      if (schemaSets.length > 0) {
        const presentInSchemas = schemaSets.some((set) => set.has(name));
        if (!presentInSchemas) {
          missingInSchemas.push(name);
        }
      }
    }

    statuses.push({
      target,
      required,
      coverageIds,
      schemaIds,
      missingInExamples,
      missingInSchemas
    });
  }
  return statuses;
}

export function detectDuplicateVariables(envMap: EnvMap): Map<string, string[]> {
  const ownership = new Map<string, Set<string>>();
  for (const [target, vars] of Object.entries(envMap)) {
    for (const variable of vars) {
      if (!ownership.has(variable)) {
        ownership.set(variable, new Set());
      }
      ownership.get(variable)!.add(target);
    }
  }
  const duplicates = new Map<string, string[]>();
  for (const [variable, owners] of ownership.entries()) {
    if (owners.size > 1) {
      duplicates.set(variable, Array.from(owners));
    }
  }
  return duplicates;
}

export interface ProviderSummary {
  target: string;
  variables: string[];
}

export function listProviders(envMap: EnvMap): ProviderSummary[] {
  return Object.entries(envMap).map(([target, variables]) => ({ target, variables }));
}
