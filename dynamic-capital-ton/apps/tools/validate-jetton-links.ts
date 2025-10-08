#!/usr/bin/env -S deno run -A

import {
  loadProjectConfig,
  readJettonMetadata,
  resolveProjectRoot,
} from "./_shared.ts";

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

const REQUIRED_LINKS: readonly RequiredLink[] = [
  {
    label: "Dynamic Capital → token page",
    url: "https://dynamic.capital/token",
  },
  {
    label: "Tonviewer → jetton overview",
    url:
      "https://tonviewer.com/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7",
  },
  {
    label: "Tonscan → jetton overview (raw)",
    url:
      "https://tonscan.org/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7",
  },
  {
    label: "Tonscan → jetton overview (friendly)",
    url:
      "https://tonscan.org/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
  },
  {
    label: "STON.fi → pTON/DCT pool",
    url: "https://app.ston.fi/swap?from=TON&to=DCT",
  },
  {
    label: "Dedust → TON/DCT pool",
    url: "https://dedust.io/swap/TON-DCT",
  },
  {
    label: "Tonviewer → STON.fi pool wallet",
    url:
      "https://tonviewer.com/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
  },
  {
    label: "Tonviewer → Dedust pool wallet",
    url:
      "https://tonviewer.com/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
  },
];

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

  const coverage = REQUIRED_LINKS.map((link) => ({
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
