#!/usr/bin/env tsx
import { performance } from "node:perf_hooks";
import type { Response } from "undici";

import {
  TON_SITE_DOMAIN,
  TON_SITE_GATEWAY_BASE,
  TON_SITE_GATEWAY_ORIGIN,
  TON_SITE_GATEWAY_URL,
} from "../../shared/ton/site";

interface ProbeResult {
  url: string;
  ok: boolean;
  status?: number;
  bytes?: number;
  durationMs: number;
  preview?: string;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_CONCURRENCY = 4;
const PREVIEW_BYTE_LIMIT = 16_384;
const PREVIEW_CAPTURE_CHAR_LIMIT = 1_024;
const SUMMARY_PREVIEW_CHAR_LIMIT = 200;

const GATEWAY_FAILURE_INDICATORS = [
  "dns resolution failure",
  "not found",
  "upstream connect error",
  "connection timeout",
  "domain for sale",
  "forsale",
  "error",
];

const defaultGatewayBases = [
  TON_SITE_GATEWAY_BASE,
  "https://tonsite.io",
  "https://resolve.tonapi.io",
  "https://toncdn.io",
  "https://tonsite.link",
  "https://ton.site",
];

interface CliOptions {
  timeoutMs: number;
  concurrency: number;
  domain: string;
  additionalGateways: string[];
  additionalDirectCandidates: string[];
  showHelp: boolean;
}

function parseGatewayList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeDomain(input: string | undefined): string {
  if (!input) return TON_SITE_DOMAIN;
  const trimmed = input.trim();
  if (!trimmed) return TON_SITE_DOMAIN;
  const sanitized = trimmed.replace(/^\/+|\/+$/g, "");
  const looksLikeUrl = /:\/\//.test(sanitized);
  if (looksLikeUrl) {
    try {
      const url = new URL(sanitized);
      const pathSegments = url.pathname.split("/").map((segment) => segment.trim()).filter(Boolean);
      return pathSegments[pathSegments.length - 1] ?? url.hostname ?? TON_SITE_DOMAIN;
    } catch {
      // fall through to plain handling
    }
  }
  const pieces = sanitized.split("/").map((segment) => segment.trim()).filter(Boolean);
  if (pieces.length === 0) {
    return TON_SITE_DOMAIN;
  }
  return pieces[pieces.length - 1];
}

function parseArgs(argv: string[]): CliOptions {
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let concurrency = DEFAULT_CONCURRENCY;
  let domain = TON_SITE_DOMAIN;
  const additionalGateways: string[] = [];
  const additionalDirectCandidates: string[] = [];
  let showHelp = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") {
      break;
    }
    if (token === "--help" || token === "-h") {
      showHelp = true;
      break;
    }

    if (token.startsWith("--timeout=")) {
      const value = token.split("=", 2)[1];
      timeoutMs = parsePositiveInteger(value, timeoutMs);
      continue;
    }
    if (token === "--timeout") {
      timeoutMs = parsePositiveInteger(argv[index + 1], timeoutMs);
      index += 1;
      continue;
    }

    if (token.startsWith("--concurrency=")) {
      const value = token.split("=", 2)[1];
      concurrency = parsePositiveInteger(value, concurrency);
      continue;
    }
    if (token === "--concurrency") {
      concurrency = parsePositiveInteger(argv[index + 1], concurrency);
      index += 1;
      continue;
    }

    if (token.startsWith("--domain=")) {
      const value = token.split("=", 2)[1];
      domain = normalizeDomain(value ?? domain);
      continue;
    }
    if (token === "--domain") {
      const value = argv[index + 1];
      domain = normalizeDomain(value ?? domain);
      index += 1;
      continue;
    }

    if (token.startsWith("--gateways=")) {
      const value = token.split("=", 2)[1];
      additionalGateways.push(...parseGatewayList(value));
      continue;
    }
    if (token === "--gateways") {
      additionalGateways.push(...parseGatewayList(argv[index + 1]));
      index += 1;
      continue;
    }
    if (token.startsWith("--gateway=")) {
      const value = token.split("=", 2)[1];
      if (value) {
        additionalGateways.push(value.trim());
      }
      continue;
    }
    if (token === "--gateway") {
      const value = argv[index + 1];
      if (value) {
        additionalGateways.push(value.trim());
      }
      index += 1;
      continue;
    }

    if (token.startsWith("--reverse-proxies=")) {
      const value = token.split("=", 2)[1];
      additionalDirectCandidates.push(...parseGatewayList(value));
      continue;
    }
    if (token === "--reverse-proxies") {
      additionalDirectCandidates.push(...parseGatewayList(argv[index + 1]));
      index += 1;
      continue;
    }
    if (token.startsWith("--reverse-proxy=")) {
      const value = token.split("=", 2)[1];
      if (value) {
        additionalDirectCandidates.push(value.trim());
      }
      continue;
    }
    if (token === "--reverse-proxy") {
      const value = argv[index + 1];
      if (value) {
        additionalDirectCandidates.push(value.trim());
      }
      index += 1;
      continue;
    }

    if (token.startsWith("--candidate=")) {
      const value = token.split("=", 2)[1];
      if (value) {
        additionalDirectCandidates.push(value.trim());
      }
      continue;
    }
    if (token === "--candidate") {
      const value = argv[index + 1];
      if (value) {
        additionalDirectCandidates.push(value.trim());
      }
      index += 1;
      continue;
    }

    if (token.startsWith("--candidates=")) {
      const value = token.split("=", 2)[1];
      additionalDirectCandidates.push(...parseGatewayList(value));
      continue;
    }
    if (token === "--candidates") {
      additionalDirectCandidates.push(...parseGatewayList(argv[index + 1]));
      index += 1;
      continue;
    }

    console.warn(`Ignoring unrecognised argument: ${token}`);
  }

  domain = normalizeDomain(domain);

  return {
    timeoutMs,
    concurrency,
    domain,
    additionalGateways,
    additionalDirectCandidates,
    showHelp,
  };
}

function uniqueGateways(values: string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    seen.add(trimmed.replace(/\s+/g, ""));
  }
  return Array.from(seen);
}

const rawGatewayList = process.env.TON_SITE_GATEWAYS;
const configuredGatewayBases = parseGatewayList(rawGatewayList);
const rawDirectCandidates = process.env.TON_SITE_DIRECT_CANDIDATES;
const configuredDirectCandidates = parseGatewayList(rawDirectCandidates);

const DOMAIN_PLACEHOLDER_PATTERN = /%(?:DOMAIN|domain)%|\{\{?\s*DOMAIN\s*\}?\}|:\s*domain\b/gi;

function substituteDomainPlaceholder(value: string, domain: string): string | undefined {
  DOMAIN_PLACEHOLDER_PATTERN.lastIndex = 0;
  if (!DOMAIN_PLACEHOLDER_PATTERN.test(value)) {
    return undefined;
  }
  DOMAIN_PLACEHOLDER_PATTERN.lastIndex = 0;
  return value.replace(DOMAIN_PLACEHOLDER_PATTERN, domain);
}

function resolveGatewayCandidate(base: string, domain: string): string | undefined {
  const trimmed = base.trim();
  if (!trimmed) return undefined;
  let normalized = trimmed.replace(/\s+/g, "");

  const substituted = substituteDomainPlaceholder(normalized, domain);
  if (substituted) {
    normalized = substituted;
  }

  try {
    const url = new URL(normalized);
    normalized = url.toString();
  } catch {
    if (!/^https?:\/\//i.test(normalized)) {
      return undefined;
    }
  }
  normalized = normalized.replace(/\/+$/, "");
  if (!normalized) return undefined;
  if (substituted) {
    return normalized;
  }
  if (normalized.endsWith(`/${domain}`)) {
    return normalized;
  }
  return `${normalized}/${domain}`;
}

function buildCandidateUrls(
  domain: string,
  gatewayBases: string[],
  directCandidates: string[],
): string[] {
  const urls = new Set<string>();
  const primaryCandidate = resolveGatewayCandidate(TON_SITE_GATEWAY_BASE, domain);
  if (primaryCandidate) {
    urls.add(primaryCandidate);
  }
  if (domain === TON_SITE_DOMAIN) {
    urls.add(TON_SITE_GATEWAY_URL);
    urls.add(TON_SITE_GATEWAY_ORIGIN);
  }
  for (const base of gatewayBases) {
    const candidate = resolveGatewayCandidate(base, domain);
    if (candidate) {
      urls.add(candidate);
    }
  }
  for (const direct of directCandidates) {
    const candidate = normalizeDirectCandidate(direct, domain);
    if (candidate) {
      urls.add(candidate);
    }
  }
  return Array.from(urls);
}

function normalizeDirectCandidate(value: string, domain: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  let normalized = trimmed.replace(/\s+/g, "");
  const substituted = substituteDomainPlaceholder(normalized, domain);
  if (substituted) {
    normalized = substituted;
  }
  try {
    const url = new URL(normalized);
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

function sanitizePreview(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, SUMMARY_PREVIEW_CHAR_LIMIT);
}

async function readPreview(
  response: Response,
): Promise<{ preview?: string; bytes?: number }>
{
  const declaredSizeHeader = response.headers.get("content-length");
  const declaredSizeRaw = declaredSizeHeader
    ? Number.parseInt(declaredSizeHeader, 10)
    : undefined;
  const declaredSize = typeof declaredSizeRaw === "number" && Number.isFinite(declaredSizeRaw) && declaredSizeRaw >= 0
    ? declaredSizeRaw
    : undefined;

  const body = response.body;
  if (!body) {
    const text = await response.text();
    const preview = sanitizePreview(text);
    const bytes = Buffer.byteLength(text, "utf8");
    return {
      preview: preview || undefined,
      bytes,
    };
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let totalRead = 0;
  let previewText = "";
  let shouldCancel = false;
  let streamEnded = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        previewText += decoder.decode();
        streamEnded = true;
        break;
      }
      if (!value) {
        continue;
      }

      totalRead += value.byteLength;

      if (previewText.length < PREVIEW_CAPTURE_CHAR_LIMIT) {
        previewText += decoder.decode(value, { stream: true });
        if (previewText.length > PREVIEW_CAPTURE_CHAR_LIMIT) {
          previewText = previewText.slice(0, PREVIEW_CAPTURE_CHAR_LIMIT);
        }
      }

      if (totalRead >= PREVIEW_BYTE_LIMIT || previewText.length >= PREVIEW_CAPTURE_CHAR_LIMIT) {
        shouldCancel = true;
        break;
      }
    }
  } finally {
    if (shouldCancel) {
      try {
        await reader.cancel();
      } catch {
        // ignore cancellation failures
      }
    }
  }

  if (!streamEnded) {
    previewText += decoder.decode();
  }

  const preview = sanitizePreview(previewText);
  return {
    preview: preview || undefined,
    bytes: declaredSize ?? (totalRead > 0 ? totalRead : undefined),
  };
}

async function probe(url: string, timeoutMs: number): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const { preview, bytes } = await readPreview(response);
      const durationMs = performance.now() - start;
      const lowerPreview = (preview ?? "").toLowerCase();
      const flaggedFailure = GATEWAY_FAILURE_INDICATORS.some((indicator) =>
        lowerPreview.includes(indicator)
      );
      const ok = response.ok && !flaggedFailure;
      return {
        url,
        ok,
        status: response.status,
        bytes,
        durationMs,
        preview,
        error: flaggedFailure ? "Gateway returned an error page" : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const durationMs = performance.now() - start;
    return {
      url,
      ok: false,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatDuration(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

function logResult(result: ProbeResult) {
  const statusLabel = result.status ? `status=${result.status}` : "status=ERR";
  const sizeLabel = typeof result.bytes === "number"
    ? `, bytes=${result.bytes}`
    : "";
  const baseMessage = `${statusLabel} ${formatDuration(result.durationMs)}${sizeLabel}`;
  if (result.ok) {
    console.log(`✅ ${result.url} → ${baseMessage}`);
  } else {
    const errorDetails = result.error ? ` (${result.error})` : "";
    console.log(`❌ ${result.url} → ${baseMessage}${errorDetails}`);
    if (result.preview) {
      console.log(`   preview: ${result.preview}`);
    }
  }
}

function printSummary(results: ProbeResult[], domain: string) {
  const successful = results.filter((entry) => entry.ok);
  if (successful.length > 0) {
    const best = successful.reduce((a, b) => (a.durationMs <= b.durationMs ? a : b));
    console.log(
      `\n${domain} is reachable via ${best.url} (status ${best.status}, ${formatDuration(best.durationMs)}).`,
    );
  } else {
    console.error(`\nUnable to reach ${domain} through any configured gateway.`);
    process.exitCode = 1;
  }
}

function printHelp() {
  console.log(`Usage: ton:site-status [options]

Checks availability of the configured TON Site gateway candidates.

Options:
  --timeout <ms>        Request timeout per gateway (default: ${DEFAULT_TIMEOUT_MS}ms)
  --concurrency <n>     Number of concurrent probes (default: ${DEFAULT_CONCURRENCY})
  --domain <name>       Override the TON Site domain to probe (default: ${TON_SITE_DOMAIN})
  --gateway <url>       Add a gateway base URL (can be repeated)
  --gateways <list>     Comma- or whitespace-separated list of gateway base URLs
  --reverse-proxy <url> Add a fully-qualified reverse proxy candidate URL (can be repeated)
  --reverse-proxies <list>
                        Comma- or whitespace-separated list of reverse proxy URLs
  --candidate <url>     Alias for --reverse-proxy
  --candidates <list>   Alias for --reverse-proxies
  --help                Show this message
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  if (options.showHelp) {
    printHelp();
    return;
  }

  const defaultDirectCandidates = [
    "https://dynamic-capital.ondigitalocean.app/ton-site",
    "https://dynamic-capital.vercel.app/ton-site",
    "https://dynamic-capital.lovable.app/ton-site",
  ];

  const gatewayBases = configuredGatewayBases.length > 0
    ? configuredGatewayBases
    : defaultGatewayBases;
  const directCandidates = configuredDirectCandidates.length > 0
    ? configuredDirectCandidates
    : defaultDirectCandidates;
  const allGateways = uniqueGateways([
    ...gatewayBases,
    ...options.additionalGateways,
  ]);
  const allDirectCandidates = uniqueGateways([
    ...directCandidates,
    ...options.additionalDirectCandidates,
  ]);

  console.log(`Checking TON Site status for ${options.domain}...`);
  const candidates = buildCandidateUrls(
    options.domain,
    allGateways,
    allDirectCandidates,
  );
  if (candidates.length === 0) {
    console.warn("No gateway candidates configured; nothing to probe.");
    return;
  }
  console.log(
    `Probing ${candidates.length} gateway candidate(s) with concurrency=${options.concurrency}.\n`,
  );

  const results = await probeWithConcurrency(
    candidates,
    options.timeoutMs,
    options.concurrency,
  );
  for (const result of results) {
    logResult(result);
  }

  printSummary(results, options.domain);
}

async function probeWithConcurrency(
  urls: string[],
  timeout: number,
  concurrency: number,
): Promise<ProbeResult[]> {
  const limit = Math.max(1, concurrency);
  const results: ProbeResult[] = new Array(urls.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= urls.length) {
        break;
      }
      results[currentIndex] = await probe(urls[currentIndex], timeout);
    }
  }

  const workerCount = Math.min(limit, urls.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

await main();
