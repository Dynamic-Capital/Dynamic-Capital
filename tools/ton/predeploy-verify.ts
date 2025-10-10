#!/usr/bin/env tsx
import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { clearTimeout as clearTimer, setTimeout as startTimer } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { fetch, ProxyAgent, setGlobalDispatcher } from "undici";

import { TON_SITE_DOMAIN } from "../../shared/ton/site";

interface TonDnsGatewayConfig {
  readonly host?: string;
  readonly url?: string;
  readonly provider?: string;
  readonly note?: string;
  readonly upstream?: string;
}

interface TonDnsConfig {
  readonly domain?: string;
  readonly ton_site?: {
    readonly gateways?: {
      readonly primary?: TonDnsGatewayConfig;
      readonly fallback?: TonDnsGatewayConfig;
    };
  };
}

interface CliOptions {
  projectRoot: string;
  buildDir: string;
  configPath: string;
  originOverride?: string;
  timeoutMs: number;
}

const REQUIRED_ASSET_PATHS = [
  "public/icon-mark.svg",
  "public/social/social-preview.svg",
  "public/tonconnect-manifest.json",
  "public/offline.html",
] as const;

type RequiredAssetPath = (typeof REQUIRED_ASSET_PATHS)[number];

function configureProxy(): void {
  const proxyUrl =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy;

  if (!proxyUrl) return;

  try {
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  Failed to configure proxy agent (${reason}). Proceeding without proxy.`);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const defaults: CliOptions = {
    projectRoot: "apps/web",
    buildDir: "apps/web/.next",
    configPath: "dns/dynamiccapital.ton.json",
    timeoutMs: 10_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token.startsWith("--project=")) {
      defaults.projectRoot = token.split("=", 2)[1] ?? defaults.projectRoot;
      continue;
    }
    if (token === "--project") {
      defaults.projectRoot = argv[i + 1] ?? defaults.projectRoot;
      i += 1;
      continue;
    }

    if (token.startsWith("--build-dir=")) {
      defaults.buildDir = token.split("=", 2)[1] ?? defaults.buildDir;
      continue;
    }
    if (token === "--build-dir") {
      defaults.buildDir = argv[i + 1] ?? defaults.buildDir;
      i += 1;
      continue;
    }

    if (token.startsWith("--config=")) {
      defaults.configPath = token.split("=", 2)[1] ?? defaults.configPath;
      continue;
    }
    if (token === "--config") {
      defaults.configPath = argv[i + 1] ?? defaults.configPath;
      i += 1;
      continue;
    }

    if (token.startsWith("--origin=")) {
      defaults.originOverride = token.split("=", 2)[1];
      continue;
    }
    if (token === "--origin") {
      defaults.originOverride = argv[i + 1];
      i += 1;
      continue;
    }

    if (token.startsWith("--timeout=")) {
      const parsed = Number.parseInt(token.split("=", 2)[1] ?? "", 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        defaults.timeoutMs = parsed;
      }
      continue;
    }
    if (token === "--timeout") {
      const parsed = Number.parseInt(argv[i + 1] ?? "", 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        defaults.timeoutMs = parsed;
      }
      i += 1;
      continue;
    }
  }

  defaults.projectRoot = resolve(defaults.projectRoot);
  defaults.buildDir = resolve(defaults.buildDir);
  defaults.configPath = resolve(defaults.configPath);
  if (defaults.originOverride) {
    defaults.originOverride = defaults.originOverride.trim();
  }

  return defaults;
}

async function ensureTonRouteExists(buildDir: string): Promise<string> {
  const tonAppDir = join(buildDir, "server", "app", "ton-site");
  const dirEntries = await readdir(tonAppDir, { withFileTypes: true }).catch(
    (error) => {
      throw new Error(
        `TON Site build output missing. Run 'npm run build:web' first. (${error.message ?? error})`,
      );
    },
  );

  const targetDir = dirEntries.find((entry) =>
    entry.isDirectory() && decodeURIComponent(entry.name) === "[[...path]]"
  );

  if (!targetDir) {
    throw new Error(
      `Unable to locate compiled [[...path]] route under ${tonAppDir}. Ensure the TON Site route is part of the build.`,
    );
  }

  const routeDir = join(tonAppDir, targetDir.name);
  const routeFiles = await readdir(routeDir, { withFileTypes: true });
  const routeFile = routeFiles.find((entry) =>
    entry.isFile() && /^route\.(mjs|js|cjs)$/.test(entry.name)
  );

  if (!routeFile) {
    throw new Error(
      `Compiled TON Site route missing JavaScript handler in ${routeDir}.`,
    );
  }

  const resolved = join(routeDir, routeFile.name);
  await access(resolved);
  return resolved;
}

async function ensureAssets(projectRoot: string): Promise<RequiredAssetPath[]> {
  const resolvedPaths: RequiredAssetPath[] = [];
  for (const relative of REQUIRED_ASSET_PATHS) {
    const absolutePath = join(projectRoot, relative);
    try {
      await access(absolutePath);
      resolvedPaths.push(relative);
    } catch (error) {
      throw new Error(
        `Required TON Site asset missing: ${absolutePath} (${error.message ?? error})`,
      );
    }
  }
  return resolvedPaths;
}

async function readConfig(configPath: string): Promise<TonDnsConfig> {
  const raw = await readFile(configPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return parsed as TonDnsConfig;
  } catch (error) {
    throw new Error(`Failed to parse ${configPath}: ${error.message ?? error}`);
  }
}

function normalizeBaseUrl(input: string | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "");
}

function buildOriginUrl(base: string, domain: string): string {
  const sanitizedBase = normalizeBaseUrl(base);
  const sanitizedDomain = domain.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!sanitizedBase) {
    throw new Error("Origin base URL is empty.");
  }
  return `${sanitizedBase}/${sanitizedDomain || TON_SITE_DOMAIN}`;
}

async function ensureOriginHealthy(
  originBase: string,
  domain: string,
  timeoutMs: number,
): Promise<{ status: number; bytes: number }>
{
  const controller = new AbortController();
  const timeout = startTimer(() => controller.abort(), timeoutMs);
  try {
    const originUrl = buildOriginUrl(originBase, domain);
    const response = await fetch(originUrl, {
      signal: controller.signal,
      redirect: "manual",
    });
    const status = response.status;
    const buffer = await response.arrayBuffer();
    const bytes = buffer.byteLength;
    if (status !== 200) {
      throw new Error(
        `Origin ${originUrl} responded with HTTP ${status}. Redeploy before enabling gateways.`,
      );
    }
    return { status, bytes };
  } catch (error) {
    throw new Error(
      `Failed to verify origin health for ${domain}: ${
        (error as Error).message ?? error
      }`,
    );
  } finally {
    clearTimer(timeout);
  }
}

async function main(): Promise<void> {
  configureProxy();
  const options = parseArgs(process.argv.slice(2));
  const config = await readConfig(options.configPath);
  const domain = String(config?.domain ?? TON_SITE_DOMAIN);
  const upstream = normalizeBaseUrl(
    options.originOverride ?? config?.ton_site?.gateways?.primary?.upstream,
  );

  if (!upstream) {
    throw new Error(
      "Unable to determine upstream origin. Provide --origin or populate ton_site.gateways.primary.upstream.",
    );
  }

  console.log("🔍 TON Site pre-deployment verification");
  console.log(`  • Domain: ${domain}`);
  console.log(`  • Project root: ${options.projectRoot}`);
  console.log(`  • Build output: ${options.buildDir}`);
  console.log(`  • Upstream origin: ${upstream}`);

  const routePath = await ensureTonRouteExists(options.buildDir);
  console.log(`✅ Route compiled: ${routePath}`);

  const assets = await ensureAssets(options.projectRoot);
  for (const asset of assets) {
    console.log(`✅ Asset present: ${join(options.projectRoot, asset)}`);
  }

  const { status, bytes } = await ensureOriginHealthy(
    upstream,
    domain,
    options.timeoutMs,
  );
  console.log(
    `✅ Origin healthy: HTTP ${status} (${bytes.toLocaleString()} bytes returned)`,
  );

  console.log("TON Site bundle is ready for gateway activation.");
}

main()
  .catch(async (error) => {
    console.error("❌ TON Site pre-deployment verification failed:");
    console.error(error instanceof Error ? error.message : error);
    await delay(0);
    process.exitCode = 1;
  });
