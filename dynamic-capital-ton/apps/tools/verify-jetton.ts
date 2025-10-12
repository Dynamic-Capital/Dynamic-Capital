#!/usr/bin/env -S deno run -A

import { join, relative } from "node:path";

import {
  computeSha256Hex,
  loadProjectConfig,
  readJettonMetadata,
  resolveProjectRoot,
} from "./_shared.ts";

interface JettonMetadata {
  [key: string]: unknown;
}

interface TonapiJettonResponse {
  verification?: string;
  total_supply?: string;
  holders_count?: number;
  metadata?: JettonMetadata;
}

interface ComparisonRow {
  field: string;
  local: string;
  tonapi: string;
  match: boolean;
}

const AUTO_SECTION_START = "<!-- TONVIEWER_STATUS:START -->";
const AUTO_SECTION_END = "<!-- TONVIEWER_STATUS:END -->";
const EXECUTION_COMMAND =
  "$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/verify-jetton.ts";

function formatUtcTimestamp(date: Date): string {
  const iso = date.toISOString();
  const [day, time] = iso.split("T");
  const [seconds] = time.replace("Z", "").split(".");
  return `${day} ${seconds}`;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatMetadataValue(key: string, value: string): string {
  if (!value) {
    return "—";
  }
  if (key === "address") {
    return `\`${value}\``;
  }
  if (key === "image") {
    return `[Image](${value})`;
  }
  return value;
}

function buildComparisonRows(
  metadata: JettonMetadata,
  remoteMetadata: JettonMetadata,
): ComparisonRow[] {
  const fields: Array<{ key: string; label: string }> = [
    { key: "name", label: "Name" },
    { key: "symbol", label: "Symbol" },
    { key: "decimals", label: "Decimals" },
    { key: "image", label: "Image URL" },
    { key: "address", label: "Jetton Address" },
  ];

  return fields.map(({ key, label }) => {
    const localValue = normalize(metadata[key]);
    const remoteValue = normalize(remoteMetadata[key]);
    return {
      field: label,
      local: formatMetadataValue(key, localValue),
      tonapi: formatMetadataValue(key, remoteValue),
      match: localValue === remoteValue,
    };
  });
}

function renderComparisonTable(rows: ComparisonRow[]): string {
  const header = "| Field | Local | Tonapi | Match |";
  const divider = "| --- | --- | --- | --- |";
  const body = rows.map((row) => {
    const matchEmoji = row.match ? "✅" : "⚠️";
    return `| ${row.field} | ${row.local} | ${row.tonapi} | ${matchEmoji} |`;
  });
  return [header, divider, ...body].join("\n");
}

function formatNumberWithGrouping(value: bigint): string {
  const formatter = new Intl.NumberFormat("en-US");
  return formatter.format(Number(value));
}

function formatHumanSupply(
  raw: string | undefined,
  decimals: number,
): string | null {
  if (!raw) {
    return null;
  }
  let atomic: bigint;
  try {
    atomic = BigInt(raw);
  } catch {
    return null;
  }
  if (decimals < 0) {
    return null;
  }
  const factor = BigInt(10) ** BigInt(decimals);
  const whole = atomic / factor;
  const fraction = atomic % factor;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(
    /0+$/,
    "",
  );
  const formattedWhole = formatNumberWithGrouping(whole);
  return fractionStr.length > 0
    ? `${formattedWhole}.${fractionStr}`
    : formattedWhole;
}

function renderNetworkMetrics(
  tonapi: TonapiJettonResponse,
  decimals: number,
): string {
  const rows: Array<{ metric: string; value: string }> = [];
  const verification = tonapi.verification ?? "unknown";
  const verificationValue =
    verification === "verified" || verification === "whitelist"
      ? `\`${verification}\``
      : `\`${verification}\` (jetton remains unverified)`;
  rows.push({
    metric: "Tonapi verification flag",
    value: verificationValue,
  });

  if (tonapi.total_supply) {
    rows.push({
      metric: "Reported total supply (raw)",
      value: `\`${tonapi.total_supply}\``,
    });
    const human = formatHumanSupply(tonapi.total_supply, decimals);
    if (human) {
      rows.push({
        metric: `Reported total supply (human, Ð${decimals})`,
        value: `${human} DCT`,
      });
    }
  }

  if (typeof tonapi.holders_count === "number") {
    rows.push({
      metric: "Holder count",
      value: `${tonapi.holders_count} wallets`,
    });
  }

  const header = "| Metric | Value |";
  const divider = "| --- | --- |";
  const body = rows.map((row) => `| ${row.metric} | ${row.value} |`);
  return [header, divider, ...body].join("\n");
}

async function fetchTonapiData(address: string): Promise<TonapiJettonResponse> {
  const response = await fetch(`https://tonapi.io/v2/jettons/${address}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch Tonapi jetton data (status ${response.status}): ${body}`,
    );
  }
  return await response.json() as TonapiJettonResponse;
}

function updateAutoSection(existing: string, generated: string): string {
  const pattern =
    /<!-- TONVIEWER_STATUS:START -->[\s\S]*?<!-- TONVIEWER_STATUS:END -->/;
  if (!pattern.test(existing)) {
    throw new Error(
      "tonviewer-status-report.md is missing the auto-generated section markers.",
    );
  }
  return existing.replace(pattern, generated);
}

async function main() {
  const projectRoot = resolveProjectRoot(import.meta.url);
  const config = await loadProjectConfig(projectRoot);
  const jettonAddress = config.token?.address ?? "";
  if (!jettonAddress) {
    console.error("Jetton address missing from config.yaml → token.address");
    Deno.exit(1);
  }

  const metadataInfo = await readJettonMetadata(projectRoot);
  const metadataSha = await computeSha256Hex(metadataInfo.bytes);
  const tonapiData = await fetchTonapiData(jettonAddress);
  const remoteMetadata = tonapiData.metadata ?? {};
  const comparisonRows = buildComparisonRows(metadataInfo.json, remoteMetadata);
  const runDate = new Date();
  const decimals = Number(metadataInfo.json["decimals"] ?? 0);

  const relativeMetadataPath = relative(projectRoot, metadataInfo.path)
    .split("\\").join("/");

  const comparisonTable = renderComparisonTable(comparisonRows);
  const networkMetrics = renderNetworkMetrics(
    tonapiData,
    Number.isFinite(decimals) ? decimals : 0,
  );

  const autoSectionLines = [
    AUTO_SECTION_START,
    "## Run Context",
    "",
    `- **Run Date (UTC):** ${formatUtcTimestamp(runDate)}`,
    "- **Execution Command:**",
    `  \`${EXECUTION_COMMAND}\``,
    "- **Jetton Address:**",
    `  \`${jettonAddress}\``,
    "- **Tonviewer Page:**",
    `  https://tonviewer.com/jetton/${jettonAddress}`,
    `- **Local Metadata Path:** ${relativeMetadataPath}`,
    "- **Local Metadata SHA-256:**",
    `  \`${metadataSha}\``,
    "",
    "## Metadata Comparison",
    "",
    comparisonTable,
    "",
    "## Network Metrics",
    "",
    networkMetrics,
    "",
    tonapiData.verification === "verified" ||
      tonapiData.verification === "whitelist"
      ? "✅ Tonviewer/Tonapi report the jetton as verified."
      : "⚠️ Tonviewer/Tonapi still report the jetton as unverified. Follow up on the submitted ticket.",
    AUTO_SECTION_END,
  ];

  const generatedSection = autoSectionLines.join("\n");

  const reportPath = join(
    projectRoot,
    "apps",
    "tools",
    "tonviewer-status-report.md",
  );
  const existingReport = await Deno.readTextFile(reportPath);
  const updatedReport = updateAutoSection(existingReport, generatedSection);
  await Deno.writeTextFile(reportPath, `${updatedReport.trimEnd()}\n`);

  console.log(
    "Updated tonviewer-status-report.md with the latest Tonapi snapshot.",
  );

  const mismatches = comparisonRows.filter((row) => !row.match);
  if (mismatches.length > 0) {
    console.warn(
      "⚠️ Detected metadata differences. Investigate before resubmission.",
    );
    Deno.exit(2);
  }

  if (
    tonapiData.verification !== "whitelist" &&
    tonapiData.verification !== "verified"
  ) {
    console.warn(
      "⚠️ Tonviewer/Tonapi still report the jetton as unverified. Follow up on the submitted ticket.",
    );
    Deno.exit(3);
  }
}

if (import.meta.main) {
  await main();
}
