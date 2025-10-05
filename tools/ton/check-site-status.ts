#!/usr/bin/env tsx
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import type { Response } from "undici";

const require = createRequire(import.meta.url);
const dns: typeof import("node:dns") = require("node:dns");
const dnsPromises: typeof import("node:dns/promises") = require(
  "node:dns/promises",
);

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
  hostOverrideEntries: string[];
  showHelp: boolean;
}

function parseGatewayList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
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
      const pathSegments = url.pathname.split("/").map((segment) =>
        segment.trim()
      ).filter(Boolean);
      return pathSegments[pathSegments.length - 1] ?? url.hostname ??
        TON_SITE_DOMAIN;
    } catch {
      // fall through to plain handling
    }
  }
  const pieces = sanitized.split("/").map((segment) => segment.trim()).filter(
    Boolean,
  );
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
  const hostOverrideEntries: string[] = [];
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

    if (token.startsWith("--resolve=")) {
      const value = token.slice("--resolve=".length);
      if (value) {
        hostOverrideEntries.push(value.trim());
      }
      continue;
    }
    if (token === "--resolve") {
      const value = argv[index + 1];
      if (value) {
        hostOverrideEntries.push(value.trim());
      }
      index += 1;
      continue;
    }

    if (token.startsWith("--resolves=")) {
      const value = token.slice("--resolves=".length);
      hostOverrideEntries.push(...parseHostOverrideEntries(value));
      continue;
    }
    if (token === "--resolves") {
      hostOverrideEntries.push(...parseHostOverrideEntries(argv[index + 1]));
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
    hostOverrideEntries,
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
const rawHostOverrides = process.env.TON_SITE_HOST_OVERRIDES;
const configuredHostOverrideEntries = parseHostOverrideEntries(
  rawHostOverrides,
);

interface HostOverride {
  address: string;
  family?: 4 | 6;
}

function parseHostOverrideEntries(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseHostOverrideSpec(
  value: string,
): [string, HostOverride] | undefined {
  const [hostPart, targetPart] = value.split("=", 2);
  if (!hostPart || !targetPart) {
    console.warn(`Ignoring malformed host override: ${value}`);
    return undefined;
  }

  const host = hostPart.trim().toLowerCase();
  if (!host) {
    console.warn(`Ignoring host override with empty host: ${value}`);
    return undefined;
  }

  const [addressPart, familyPart] = targetPart.split("|", 2);
  const address = addressPart.trim();
  if (!address) {
    console.warn(`Ignoring host override with empty address: ${value}`);
    return undefined;
  }

  let family: 4 | 6 | undefined;
  if (familyPart) {
    const parsed = Number.parseInt(familyPart.trim(), 10);
    if (parsed === 4 || parsed === 6) {
      family = parsed;
    } else {
      console.warn(
        `Ignoring unsupported address family in host override (${familyPart}); defaulting for ${host}.`,
      );
    }
  }

  if (!family) {
    family = address.includes(":") ? 6 : 4;
  }

  return [host, { address, family }];
}

function buildHostOverrideMap(entries: string[]): Map<string, HostOverride> {
  const overrides = new Map<string, HostOverride>();
  for (const entry of entries) {
    const parsed = parseHostOverrideSpec(entry);
    if (!parsed) continue;
    const [host, override] = parsed;
    overrides.set(host, override);
  }
  return overrides;
}

type LookupOptions = Parameters<typeof dns.lookup>[1];
type LookupCallback = Parameters<typeof dns.lookup>[2];

function applyHostOverrides(overrides: Map<string, HostOverride>): () => void {
  if (overrides.size === 0) {
    return () => {};
  }

  const normalized = new Map<string, HostOverride>();
  for (const [host, override] of overrides.entries()) {
    normalized.set(host.toLowerCase(), override);
  }

  const originalLookup = dns.lookup;
  const originalPromisesLookup = dnsPromises.lookup.bind(dnsPromises);

  function resolveOverride(hostname: string) {
    return normalized.get(hostname.toLowerCase());
  }

  function handleLookup(
    hostname: string,
    options: LookupOptions | undefined,
    callback: LookupCallback,
  ): boolean {
    const override = resolveOverride(hostname);
    if (!override) return false;
    const wantsAll = Boolean(
      options && typeof options === "object" &&
        (options as { all?: boolean }).all,
    );
    const family = override.family ?? (override.address.includes(":") ? 6 : 4);
    queueMicrotask(() => {
      if (wantsAll) {
        callback(null, [{ address: override.address, family }]);
      } else {
        callback(null, override.address, family);
      }
    });
    return true;
  }

  dns.lookup = function patchedLookup(
    hostname: string,
    options?: LookupOptions | LookupCallback,
    callback?: LookupCallback,
  ): any {
    if (typeof options === "function") {
      return patchedLookup.call(this, hostname, undefined, options);
    }
    if (!callback) {
      throw new Error("lookup callback is required");
    }
    if (
      handleLookup(hostname, options as LookupOptions | undefined, callback)
    ) {
      return undefined;
    }
    return originalLookup.call(
      dns,
      hostname,
      options as LookupOptions,
      callback,
    );
  } as typeof dns.lookup;

  dnsPromises.lookup = async function patchedPromisesLookup(
    hostname: string,
    options?: LookupOptions,
  ) {
    const override = resolveOverride(hostname);
    if (!override) {
      return await originalPromisesLookup(hostname, options as any);
    }
    const wantsAll = Boolean(
      options && typeof options === "object" &&
        (options as { all?: boolean }).all,
    );
    const family = override.family ?? (override.address.includes(":") ? 6 : 4);
    if (wantsAll) {
      return [{ address: override.address, family }];
    }
    return { address: override.address, family };
  };

  return () => {
    dns.lookup = originalLookup;
    dnsPromises.lookup = originalPromisesLookup;
  };
}

const DOMAIN_PLACEHOLDER_PATTERN =
  /%(?:DOMAIN|domain)%|\{\{?\s*DOMAIN\s*\}?\}|:\s*domain\b/gi;

function substituteDomainPlaceholder(
  value: string,
  domain: string,
): string | undefined {
  DOMAIN_PLACEHOLDER_PATTERN.lastIndex = 0;
  if (!DOMAIN_PLACEHOLDER_PATTERN.test(value)) {
    return undefined;
  }
  DOMAIN_PLACEHOLDER_PATTERN.lastIndex = 0;
  return value.replace(DOMAIN_PLACEHOLDER_PATTERN, domain);
}

function resolveGatewayCandidate(
  base: string,
  domain: string,
): string | undefined {
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
  const primaryCandidate = resolveGatewayCandidate(
    TON_SITE_GATEWAY_BASE,
    domain,
  );
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

function normalizeDirectCandidate(
  value: string,
  domain: string,
): string | undefined {
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

type NodeLikeError = Error & {
  code?: unknown;
  errno?: unknown;
  syscall?: unknown;
  hostname?: unknown;
  address?: unknown;
  port?: unknown;
  cause?: unknown;
};

function collectErrorDetails(source: unknown, details: Set<string>) {
  if (!source || typeof source !== "object") {
    return;
  }

  const record = source as Record<string, unknown>;

  const code = record.code;
  if (typeof code === "string" && code) {
    details.add(code);
  }

  const errno = record.errno;
  if (typeof errno === "string" && errno) {
    details.add(errno);
  }

  const syscall = record.syscall;
  if (typeof syscall === "string" && syscall) {
    details.add(`syscall=${syscall}`);
  }

  const hostname = record.hostname;
  if (typeof hostname === "string" && hostname) {
    details.add(`host=${hostname}`);
  }

  const address = record.address;
  if (typeof address === "string" && address) {
    details.add(`address=${address}`);
  }

  const port = record.port;
  if (typeof port === "number" && Number.isFinite(port)) {
    details.add(`port=${port}`);
  }

  const message = record.message;
  if (typeof message === "string" && message) {
    details.add(message);
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const nodeError = error as NodeLikeError;
    const details = new Set<string>();
    collectErrorDetails(nodeError, details);
    if (nodeError.cause) {
      if (nodeError.cause instanceof Error) {
        details.add(nodeError.cause.message);
        collectErrorDetails(nodeError.cause as NodeLikeError, details);
      } else {
        collectErrorDetails(nodeError.cause, details);
      }
    }

    const baseMessage = error.message || error.name || "Unknown error";
    const filtered = Array.from(details)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && entry !== baseMessage);

    if (filtered.length === 0) {
      return baseMessage;
    }
    return `${baseMessage} (${Array.from(new Set(filtered)).join(", ")})`;
  }
  return String(error);
}

async function readPreview(
  response: Response,
): Promise<{ preview?: string; bytes?: number }> {
  const declaredSizeHeader = response.headers.get("content-length");
  const declaredSizeRaw = declaredSizeHeader
    ? Number.parseInt(declaredSizeHeader, 10)
    : undefined;
  const declaredSize =
    typeof declaredSizeRaw === "number" && Number.isFinite(declaredSizeRaw) &&
      declaredSizeRaw >= 0
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

      if (
        totalRead >= PREVIEW_BYTE_LIMIT ||
        previewText.length >= PREVIEW_CAPTURE_CHAR_LIMIT
      ) {
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

async function probe(
  url: string,
  timeoutMs: number,
): Promise<ProbeResult> {
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
      const statusText = response.statusText?.trim();
      const httpError = response.ok
        ? undefined
        : statusText
        ? `${response.status} ${statusText}`
        : `HTTP ${response.status}`;
      const ok = response.ok && !flaggedFailure;
      return {
        url,
        ok,
        status: response.status,
        bytes,
        durationMs,
        preview,
        error: flaggedFailure ? "Gateway returned an error page" : httpError,
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
      error: describeError(error),
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
  const baseMessage = `${statusLabel} ${
    formatDuration(result.durationMs)
  }${sizeLabel}`;
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
    const best = successful.reduce((
      a,
      b,
    ) => (a.durationMs <= b.durationMs ? a : b));
    console.log(
      `\n${domain} is reachable via ${best.url} (status ${best.status}, ${
        formatDuration(best.durationMs)
      }).`,
    );
  } else {
    console.error(
      `\nUnable to reach ${domain} through any configured gateway.`,
    );
    const breakdown = summarizeFailures(results);
    if (breakdown.length > 0) {
      console.error("Failure breakdown:");
      for (const line of breakdown) {
        console.error(line);
      }
    }
    process.exitCode = 1;
  }
}

function summarizeFailures(results: ProbeResult[]): string[] {
  const counts = new Map<string, number>();
  for (const result of results) {
    if (result.ok) continue;
    const reason = result.error
      ? result.error
      : typeof result.status === "number"
      ? `HTTP ${result.status}`
      : "Unknown failure";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([reason, count]) => `  - ${count}× ${reason}`);
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
  --resolve host=ip     Override DNS resolution for a host (can be repeated)
  --resolves <list>     Comma- or whitespace-separated list of host=ip overrides
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
  const hostOverrides = buildHostOverrideMap([
    ...configuredHostOverrideEntries,
    ...options.hostOverrideEntries,
  ]);
  const allGateways = uniqueGateways([
    ...gatewayBases,
    ...options.additionalGateways,
  ]);
  const allDirectCandidates = uniqueGateways([
    ...directCandidates,
    ...options.additionalDirectCandidates,
  ]);

  console.log(`Checking TON Site status for ${options.domain}...`);
  if (hostOverrides.size > 0) {
    const overridesList = Array.from(hostOverrides.entries()).map((
      [host, override],
    ) =>
      `${host}→${override.address}${
        override.family ? `/${override.family}` : ""
      }`
    );
    console.log(`Applying host override(s): ${overridesList.join(", ")}`);
  }
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

  const restoreLookup = applyHostOverrides(hostOverrides);
  try {
    const results = await probeWithConcurrency(
      candidates,
      options.timeoutMs,
      options.concurrency,
    );
    for (const result of results) {
      logResult(result);
    }

    printSummary(results, options.domain);
  } finally {
    restoreLookup();
  }
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
