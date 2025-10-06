#!/usr/bin/env -S deno run -A

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

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

async function fetchJettonData(address: string): Promise<TonapiJettonResponse> {
  const response = await fetch(`https://tonapi.io/v2/jettons/${address}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch Tonapi jetton data (status ${response.status}): ${body}`,
    );
  }
  return await response.json() as TonapiJettonResponse;
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

  const tonapiData = await fetchJettonData(jettonAddress);
  const remoteMetadata = tonapiData.metadata ?? {};

  const comparisonFields = [
    { key: "name", label: "Name" },
    { key: "symbol", label: "Symbol" },
    { key: "decimals", label: "Decimals" },
    { key: "image", label: "Image URL" },
    { key: "address", label: "Jetton Address" },
  ] as const;

  const comparisons = comparisonFields.map(({ key, label }) => {
    const localValue = normalizeValue(metadataInfo.json[key]);
    const remoteValue = normalizeValue(remoteMetadata[key]);
    return {
      Field: label,
      Local: localValue,
      Tonapi: remoteValue,
      Match: localValue === remoteValue ? "✅" : "⚠️",
    };
  });

  const mismatches = comparisons.filter((entry) => entry.Match !== "✅");

  console.log("Dynamic Capital Token → Tonviewer status report\n");
  console.log(`Jetton address: ${jettonAddress}`);
  console.log(`Local metadata path: ${metadataInfo.path}`);
  console.log(`Local metadata SHA-256: ${metadataSha}`);
  console.log(
    `Tonviewer page: https://tonviewer.com/jetton/${jettonAddress}\n`,
  );

  console.log("Metadata comparison:");
  console.table(comparisons);

  console.log(
    `\nTonapi verification flag: ${tonapiData.verification ?? "unknown"}`,
  );
  if (tonapiData.total_supply) {
    console.log(`Reported total supply: ${tonapiData.total_supply}`);
  }
  if (typeof tonapiData.holders_count === "number") {
    console.log(`Holder count (Tonapi): ${tonapiData.holders_count}`);
  }

  if (mismatches.length > 0) {
    console.warn("\n⚠️ Detected metadata differences. Investigate before resubmission.");
    Deno.exit(2);
  }

  if (tonapiData.verification !== "whitelist" && tonapiData.verification !== "verified") {
    console.warn(
      "\n⚠️ Tonviewer/Tonapi still report the jetton as unverified. Follow up on the submitted ticket.",
    );
    Deno.exit(3);
  }

  console.log("\n✅ Tonviewer reports the jetton as verified.");
}

if (import.meta.main) {
  await main();
}
