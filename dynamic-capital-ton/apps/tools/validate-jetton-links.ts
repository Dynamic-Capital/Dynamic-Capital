#!/usr/bin/env -S deno run -A

import {
  loadProjectConfig,
  readJettonMetadata,
  resolveProjectRoot,
} from "./_shared.ts";
import { DCT_DEX_POOLS } from "../../../shared/ton/dct-liquidity.ts";
import {
  TON_MAINNET_DAO_MULTISIG,
  TON_MAINNET_JETTON_MASTER,
} from "../../../shared/ton/mainnet-addresses.ts";

interface RequiredLink {
  label: string;
  url: string;
}

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  detail?: string;
}

type LoadedConfig = Awaited<ReturnType<typeof loadProjectConfig>>;

const DCT_JETTON_MASTER_RAW =
  "0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7" as const;

const DEX_SCREENER_TOKEN_URL =
  `https://dexscreener.com/ton/${TON_MAINNET_JETTON_MASTER}` as const;
const X1000_TOKEN_URL =
  `https://x1000.finance/tokens/${TON_MAINNET_DAO_MULTISIG}` as const;

const REQUIRED_LINKS: readonly RequiredLink[] = [
  {
    label: "Dynamic Capital → token page",
    url: "https://dynamic.capital/token",
  },
  {
    label: "Dynamic Capital (TON domain) → token page",
    url: "https://dynamiccapital.ton/token",
  },
  {
    label: "Tonviewer → jetton overview",
    url: `https://tonviewer.com/jetton/${DCT_JETTON_MASTER_RAW}`,
  },
  {
    label: "Tonviewer → jetton overview (friendly)",
    url: `https://tonviewer.com/jetton/${TON_MAINNET_JETTON_MASTER}`,
  },
  {
    label: "Tonscan → jetton overview (raw)",
    url: `https://tonscan.org/jetton/${DCT_JETTON_MASTER_RAW}`,
  },
  {
    label: "Tonscan → jetton overview (friendly)",
    url: `https://tonscan.org/jetton/${TON_MAINNET_JETTON_MASTER}`,
  },
  {
    label: "DYOR → token intelligence profile",
    url: `https://dyor.io/token/${TON_MAINNET_JETTON_MASTER}`,
  },
  {
    label: "DEX Screener → token overview",
    url: DEX_SCREENER_TOKEN_URL,
  },
  {
    label: "X1000 Finance → token overview",
    url: X1000_TOKEN_URL,
  },
];

const DEX_POOL_REQUIRED_LINKS: readonly RequiredLink[] = DCT_DEX_POOLS
  .flatMap((pool) => {
    const links: RequiredLink[] = [
      { label: `${pool.dex} → swap interface`, url: pool.swapUrl },
      { label: `${pool.dex} → pool (Tonviewer)`, url: pool.poolExplorerUrl },
      {
        label: `${pool.dex} → pool (Tonscan)`,
        url: `https://tonscan.org/address/${pool.poolAddress}`,
      },
      {
        label: `${pool.dex} → jetton wallet (Tonviewer)`,
        url: pool.jettonWalletExplorerUrl,
      },
      {
        label: `${pool.dex} → jetton wallet (Tonscan)`,
        url: `https://tonscan.org/address/${pool.jettonWalletAddress}`,
      },
    ];

    if (pool.metadataUrl) {
      links.push({
        label: `${pool.dex} → pool metadata`,
        url: pool.metadataUrl,
      });
    }

    if (pool.lpJettonExplorerUrl) {
      links.push({
        label: `${pool.dex} → LP jetton (Tonviewer)`,
        url: pool.lpJettonExplorerUrl,
      });
    }

    if (pool.dexScreenerPairUrl) {
      links.push({
        label: `DEX Screener → ${pool.dex} pair`,
        url: pool.dexScreenerPairUrl,
      });
    }

    if (pool.geckoTerminalPoolUrl) {
      links.push({
        label: `${pool.dex} → pool (GeckoTerminal)`,
        url: pool.geckoTerminalPoolUrl,
      });
    }

    return links;
  }) as readonly RequiredLink[];

const OPTIONAL_LINK_MATCHERS: readonly {
  label: string;
  resolveUrl: (config: LoadedConfig) => string | undefined;
}[] = [
  {
    label: "Tonviewer → DEX router",
    resolveUrl: (cfg) => {
      const friendly = cfg.contracts?.dexRouter;
      return typeof friendly === "string"
        ? `https://tonviewer.com/${friendly}`
        : undefined;
    },
  },
];

const NETWORK_TIMEOUT_MS = 8_000;

function normalizeUrl(value: string): string {
  try {
    const parsed = new URL(value.trim());
    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.host.toLowerCase();
    const trimmedPath = parsed.pathname.replace(/\/+$/g, "");
    const pathname = trimmedPath === "/" ? "" : trimmedPath;
    const search = parsed.search;
    return `${protocol}//${host}${pathname}${search}`;
  } catch {
    return value.trim().toLowerCase();
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function formatIssue(issue: ValidationIssue): string {
  return issue.detail ? `${issue.message}: ${issue.detail}` : issue.message;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = NETWORK_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

interface DexScreenerPairSummary {
  readonly dexId?: string;
}

async function fetchDexScreenerPair(
  poolDexLabel: string,
  poolAddress: string,
  issues: ValidationIssue[],
  context: string,
): Promise<DexScreenerPairSummary | undefined> {
  const normalizedAddress = poolAddress.toLowerCase();
  const pairApiUrl =
    `https://api.dexscreener.com/latest/dex/pairs/ton/${normalizedAddress}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(pairApiUrl, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    issues.push({
      severity: "warning",
      message: `Failed to query DEX Screener pair API for ${poolDexLabel}`,
      detail: `${context}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return undefined;
  }

  if (!response.ok) {
    issues.push({
      severity: "warning",
      message:
        `DEX Screener pair API returned non-success status for ${poolDexLabel}`,
      detail: `${context}: ${response.status} ${response.statusText}`,
    });
    return undefined;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    issues.push({
      severity: "warning",
      message:
        `Unable to parse DEX Screener pair API response for ${poolDexLabel}`,
      detail: `${context}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return undefined;
  }

  const rawPair = (payload as { pair?: unknown }).pair;
  if (!rawPair || typeof rawPair !== "object") {
    issues.push({
      severity: "warning",
      message: `DEX Screener pair API returned no payload for ${poolDexLabel}`,
      detail: `${context}: ${pairApiUrl}`,
    });
    return undefined;
  }

  const pairAddress = (rawPair as { pairAddress?: unknown }).pairAddress;
  if (typeof pairAddress !== "string") {
    issues.push({
      severity: "warning",
      message: `Pair payload missing address for ${poolDexLabel}`,
      detail: `${context}: ${pairApiUrl}`,
    });
    return undefined;
  }

  if (pairAddress.toUpperCase() !== poolAddress.toUpperCase()) {
    issues.push({
      severity: "warning",
      message: `DEX Screener pair payload address mismatch for ${poolDexLabel}`,
      detail: `${context}: expected=${poolAddress} actual=${pairAddress}`,
    });
    return undefined;
  }

  const dexId = typeof (rawPair as { dexId?: unknown }).dexId === "string"
    ? (rawPair as { dexId: string }).dexId.toLowerCase()
    : undefined;

  return { dexId };
}

async function validateDexScreenerPairs(
  normalizedMap: Map<string, { url: string; index: number }>,
  issues: ValidationIssue[],
) {
  const apiUrl =
    `https://api.dexscreener.com/latest/dex/tokens/${TON_MAINNET_JETTON_MASTER}`;

  const pairLookup = new Map<string, DexScreenerPairSummary>();
  let tokenApiResponded = false;

  try {
    const response = await fetchWithTimeout(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      issues.push({
        severity: "warning",
        message: "DEX Screener token API returned non-success status",
        detail: `${response.status} ${response.statusText}`,
      });
    } else {
      tokenApiResponded = true;
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        issues.push({
          severity: "warning",
          message: "Unable to parse DEX Screener API response",
          detail: error instanceof Error ? error.message : String(error),
        });
        payload = undefined;
      }

      const pairs = Array.isArray((payload as { pairs?: unknown }).pairs)
        ? (payload as { pairs: unknown[] }).pairs
        : [];

      if (pairs.length === 0) {
        issues.push({
          severity: "warning",
          message: "DEX Screener token API returned no pair entries for DCT",
          detail: apiUrl,
        });
      }

      for (const entry of pairs) {
        if (
          entry && typeof entry === "object" &&
          typeof (entry as { pairAddress?: unknown }).pairAddress === "string"
        ) {
          const pairAddress = (entry as { pairAddress: string }).pairAddress;
          pairLookup.set(pairAddress.toUpperCase(), {
            dexId: typeof (entry as { dexId?: unknown }).dexId === "string"
              ? (entry as { dexId: string }).dexId.toLowerCase()
              : undefined,
          });
        }
      }
    }
  } catch (error) {
    issues.push({
      severity: "warning",
      message: "Failed to query DEX Screener token API",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  for (const pool of DCT_DEX_POOLS) {
    if (!pool.dexScreenerId) {
      continue;
    }

    const normalizedAddress = pool.poolAddress.toUpperCase();
    const expectedDexId = pool.dexScreenerId.toLowerCase();

    let pairSummary = pairLookup.get(normalizedAddress);
    let attemptedFallback = false;

    if (!pairSummary) {
      attemptedFallback = true;
      pairSummary = await fetchDexScreenerPair(
        pool.dex,
        pool.poolAddress,
        issues,
        "token API missing pair entry",
      );
      if (pairSummary) {
        pairLookup.set(normalizedAddress, pairSummary);
      } else if (tokenApiResponded) {
        issues.push({
          severity: "warning",
          message: `DEX Screener token API missing ${pool.dex} pair`,
          detail: pool.poolAddress,
        });
      }
    }

    if (!pairSummary) {
      continue;
    }

    if (pairSummary.dexId !== expectedDexId) {
      if (!attemptedFallback) {
        const fallback = await fetchDexScreenerPair(
          pool.dex,
          pool.poolAddress,
          issues,
          "token API dexId mismatch",
        );
        attemptedFallback = true;
        if (fallback) {
          pairSummary = fallback;
          pairLookup.set(normalizedAddress, fallback);
        }
      }

      if (pairSummary.dexId !== expectedDexId) {
        issues.push({
          severity: "warning",
          message: `${pool.dex} pair reported unexpected dexId`,
          detail: `expected=${expectedDexId} actual=${
            pairSummary.dexId ?? "unknown"
          }`,
        });
      }
    }

    if (pool.dexScreenerPairUrl) {
      const normalizedPairUrl = normalizeUrl(pool.dexScreenerPairUrl);
      if (!normalizedMap.has(normalizedPairUrl)) {
        issues.push({
          severity: "error",
          message: `Missing DEX Screener pair link for ${pool.dex}`,
          detail: pool.dexScreenerPairUrl,
        });
      }
    }
  }
}

async function verifyHttpEndpoints(issues: ValidationIssue[]) {
  const endpoints: { label: string; url: string }[] = [
    ...DCT_DEX_POOLS.flatMap((pool) => {
      const list: { label: string; url: string }[] = [
        { label: `${pool.dex} swap`, url: pool.swapUrl },
      ];

      if (pool.metadataUrl) {
        list.push({ label: `${pool.dex} metadata`, url: pool.metadataUrl });
      }

      if (pool.dexScreenerPairUrl) {
        list.push({
          label: `${pool.dex} DEX Screener pair`,
          url: pool.dexScreenerPairUrl,
        });
      }

      return list;
    }),
    { label: "DEX Screener token overview", url: DEX_SCREENER_TOKEN_URL },
  ];

  for (const endpoint of endpoints) {
    let response: Response;
    try {
      response = await fetchWithTimeout(endpoint.url, { method: "GET" });
    } catch (error) {
      issues.push({
        severity: "warning",
        message: `Failed to reach ${endpoint.label}`,
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (response.status >= 500) {
      issues.push({
        severity: "warning",
        message: `${endpoint.label} responded with ${response.status}`,
        detail: endpoint.url,
      });
    }
  }
}

async function main() {
  const projectRoot = resolveProjectRoot(import.meta.url);
  const config = await loadProjectConfig(projectRoot);
  const metadataInfo = await readJettonMetadata(projectRoot);
  const metadata = metadataInfo.json as Record<string, unknown>;

  const issues: ValidationIssue[] = [];

  const metadataAddress = typeof metadata.address === "string"
    ? metadata.address
    : "";
  const configAddress = typeof config.token?.address === "string"
    ? config.token.address
    : "";

  if (!metadataAddress) {
    issues.push({
      severity: "error",
      message: "metadata.json is missing the jetton address field",
    });
  } else if (configAddress && metadataAddress !== configAddress) {
    issues.push({
      severity: "error",
      message: "metadata address does not match config.yaml token.address",
      detail: `metadata=${metadataAddress} config=${configAddress}`,
    });
  }

  const metadataDecimals = metadata.decimals;
  const configDecimals = config.token?.decimals;
  if (typeof metadataDecimals !== "number") {
    issues.push({
      severity: "error",
      message: "metadata.decimals must be a number",
    });
  } else if (
    typeof configDecimals === "number" && metadataDecimals !== configDecimals
  ) {
    issues.push({
      severity: "error",
      message: "metadata decimals do not match config.yaml token.decimals",
      detail: `metadata=${metadataDecimals} config=${configDecimals}`,
    });
  }

  const metadataExternalUrl = metadata.external_url;
  let normalizedExternalUrl: string | undefined;
  if (typeof metadataExternalUrl !== "string") {
    issues.push({
      severity: "error",
      message: "metadata.external_url must be a non-empty string",
    });
  } else {
    const trimmedExternalUrl = metadataExternalUrl.trim();
    if (trimmedExternalUrl === "") {
      issues.push({
        severity: "error",
        message: "metadata.external_url must be a non-empty string",
      });
    } else if (!isHttpsUrl(trimmedExternalUrl)) {
      issues.push({
        severity: "error",
        message: "metadata.external_url must use https://",
        detail: metadataExternalUrl,
      });
    } else {
      normalizedExternalUrl = normalizeUrl(trimmedExternalUrl);
    }
  }

  if (
    typeof config.token?.name === "string" &&
    metadata.name !== config.token.name
  ) {
    issues.push({
      severity: "warning",
      message: "metadata name differs from config.yaml token.name",
      detail: `metadata=${metadata.name as string} config=${config.token.name}`,
    });
  }

  if (
    typeof config.token?.symbol === "string" &&
    metadata.symbol !== config.token.symbol
  ) {
    issues.push({
      severity: "warning",
      message: "metadata symbol differs from config.yaml token.symbol",
      detail: `metadata=${metadata
        .symbol as string} config=${config.token.symbol}`,
    });
  }

  const rawSameAs = metadata.sameAs;
  let sameAs: string[] = [];
  if (rawSameAs === undefined) {
    issues.push({
      severity: "error",
      message: "metadata.sameAs is missing",
    });
  } else if (!Array.isArray(rawSameAs)) {
    issues.push({
      severity: "error",
      message: "metadata.sameAs must be an array of HTTPS URLs",
    });
  } else {
    sameAs = rawSameAs.map((entry) => String(entry));
  }

  const normalizedMap = new Map<string, { url: string; index: number }>();
  sameAs.forEach((url, index) => {
    const normalized = normalizeUrl(url);
    if (!isHttpsUrl(url)) {
      issues.push({
        severity: "error",
        message: "sameAs entry must use https://",
        detail: url,
      });
    }
    const previous = normalizedMap.get(normalized);
    if (previous) {
      issues.push({
        severity: "error",
        message: "Duplicate sameAs entry detected",
        detail: `${previous.url} ↔ ${url}`,
      });
    } else {
      normalizedMap.set(normalized, { url, index });
    }
  });

  if (normalizedExternalUrl && normalizedMap.size > 0) {
    const hasExternalUrl = normalizedMap.has(normalizedExternalUrl);
    if (!hasExternalUrl) {
      issues.push({
        severity: "warning",
        message: "metadata.external_url is not listed in sameAs",
        detail: metadataExternalUrl as string,
      });
    }
  }

  const combinedRequiredLinks = [
    ...REQUIRED_LINKS,
    ...DEX_POOL_REQUIRED_LINKS,
  ];

  const coverage = combinedRequiredLinks.map((link) => ({
    label: link.label,
    url: link.url,
    present: normalizedMap.has(normalizeUrl(link.url)) ? "✅" : "❌",
  }));

  coverage
    .filter((entry) => entry.present === "❌")
    .forEach((missing) => {
      issues.push({
        severity: "error",
        message: `Missing required sameAs link (${missing.label})`,
        detail: missing.url,
      });
    });

  OPTIONAL_LINK_MATCHERS.forEach((matcher) => {
    const expectedUrl = matcher.resolveUrl(config);
    if (!expectedUrl) {
      return;
    }
    if (!normalizedMap.has(normalizeUrl(expectedUrl))) {
      issues.push({
        severity: "warning",
        message: `${matcher.label} not present in sameAs`,
        detail: expectedUrl,
      });
    }
  });

  await validateDexScreenerPairs(normalizedMap, issues);
  await verifyHttpEndpoints(issues);

  console.log("Jetton metadata link coverage\n");
  console.table(coverage);

  if (issues.length === 0) {
    console.log(
      "\n✅ metadata.json sameAs block covers all required verification links.",
    );
    return;
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  if (errors.length > 0) {
    console.error("\nErrors:");
    errors.forEach((issue) => console.error(`  • ${formatIssue(issue)}`));
  }

  if (warnings.length > 0) {
    console.warn("\nWarnings:");
    warnings.forEach((issue) => console.warn(`  • ${formatIssue(issue)}`));
  }

  Deno.exit(errors.length > 0 ? 1 : 0);
}

if (import.meta.main) {
  await main();
}
