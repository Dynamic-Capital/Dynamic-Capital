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

const rawGatewayList = process.env.TON_SITE_GATEWAYS ?? "";
const configuredGatewayBases = rawGatewayList
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const gatewayBases = configuredGatewayBases.length > 0
  ? configuredGatewayBases
  : defaultGatewayBases;

function buildCandidateUrls(): string[] {
  const urls = new Set<string>([TON_SITE_GATEWAY_URL, TON_SITE_GATEWAY_ORIGIN]);
  for (const base of gatewayBases) {
    const normalized = base.replace(/\/+$/, "");
    if (!normalized) continue;
    if (normalized.endsWith(`/${TON_SITE_DOMAIN}`)) {
      urls.add(normalized);
    } else {
      urls.add(`${normalized}/${TON_SITE_DOMAIN}`);
    }
  }
  return Array.from(urls);
}

function sanitizePreview(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, SUMMARY_PREVIEW_CHAR_LIMIT);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

function printSummary(results: ProbeResult[]) {
  const successful = results.filter((entry) => entry.ok);
  if (successful.length > 0) {
    const best = successful.reduce((a, b) => (a.durationMs <= b.durationMs ? a : b));
    console.log(
      `\nTON Site is reachable via ${best.url} (status ${best.status}, ${formatDuration(best.durationMs)}).`,
    );
  } else {
    console.error("\nUnable to reach the TON Site through any configured gateway.");
    process.exitCode = 1;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
  const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));

  const timeout = parsePositiveInteger(
    timeoutArg?.split("=", 2)[1],
    DEFAULT_TIMEOUT_MS,
  );
  const concurrency = parsePositiveInteger(
    concurrencyArg?.split("=", 2)[1],
    DEFAULT_CONCURRENCY,
  );

  console.log(`Checking TON Site status for ${TON_SITE_DOMAIN}...`);
  const candidates = buildCandidateUrls();
  if (candidates.length === 0) {
    console.warn("No gateway candidates configured; nothing to probe.");
    return;
  }
  console.log(
    `Probing ${candidates.length} gateway candidate(s) with concurrency=${concurrency}.\n`,
  );

  const results = await probeWithConcurrency(candidates, timeout, concurrency);
  for (const result of results) {
    logResult(result);
  }

  printSummary(results);
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
