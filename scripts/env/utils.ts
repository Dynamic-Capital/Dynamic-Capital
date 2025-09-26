import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type EnvDomain = {
  name: string;
  description?: string;
  visibility: "public" | "server";
  providers: string[];
  vars: string[];
};

export type EnvMap = {
  domains: EnvDomain[];
};

export type ProviderKeyMap = Map<string, Set<string>>;

export type AppEnvCheck = {
  app: string;
  missing: { public: string[]; server: string[] };
};

export type AppModule = {
  envDefinition?: { app: string; public: string[]; server: string[] };
  checkRuntimeEnv: (mode?: "throw" | "report") => {
    success: boolean;
    missing: { public: string[]; server: string[] };
  };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, "..", "..");

export async function loadEnvMap(): Promise<EnvMap> {
  const mapPath = join(repoRoot, "env", "env.map.json");
  const raw = await readFile(mapPath, "utf8");
  return JSON.parse(raw) as EnvMap;
}

export function groupByProvider(map: EnvMap): ProviderKeyMap {
  const providerMap: ProviderKeyMap = new Map();

  for (const domain of map.domains) {
    for (const provider of domain.providers) {
      const existing = providerMap.get(provider) ?? new Set<string>();
      for (const key of domain.vars) {
        existing.add(key);
      }
      providerMap.set(provider, existing);
    }
  }

  return providerMap;
}

export async function loadAppModules(): Promise<AppEnvCheck[]> {
  const apps = [
    { app: "web", path: join(repoRoot, "apps", "web", "lib", "env.ts") },
    {
      app: "landing",
      path: join(repoRoot, "apps", "landing", "lib", "env.ts"),
    },
  ];

  const results: AppEnvCheck[] = [];

  const originalSkip = process.env.DC_SKIP_RUNTIME_ENV_CHECK;
  process.env.DC_SKIP_RUNTIME_ENV_CHECK = "true";

  for (const entry of apps) {
    try {
      const mod = (await import(pathToFileURL(entry.path).href)) as AppModule;
      const result = mod.checkRuntimeEnv("report");
      results.push({ app: entry.app, missing: result.missing });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unknown import error";
      console.error(`⚠️ Failed to load ${entry.app} env module: ${message}`);
      results.push({
        app: entry.app,
        missing: { public: ["<load-error>"], server: [] },
      });
    }
  }

  if (originalSkip === undefined) {
    delete process.env.DC_SKIP_RUNTIME_ENV_CHECK;
  } else {
    process.env.DC_SKIP_RUNTIME_ENV_CHECK = originalSkip;
  }

  return results;
}
