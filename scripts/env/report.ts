#!/usr/bin/env tsx
import { listSecrets } from "./supabase.ts";
import { groupByProvider, loadAppModules, loadEnvMap } from "./utils.ts";

type ProviderReport = {
  provider: string;
  present: number;
  missing: number;
  total: number;
  status: "ok" | "missing" | "error";
  note?: string;
  missingKeys: string[];
};

async function supabaseReport(required: Set<string>): Promise<ProviderReport> {
  const missingEnv: string[] = [];
  if (!process.env.SUPABASE_PROJECT_REF) {
    missingEnv.push("SUPABASE_PROJECT_REF");
  }
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    missingEnv.push("SUPABASE_ACCESS_TOKEN");
  }

  if (missingEnv.length > 0) {
    return {
      provider: "supabase",
      present: 0,
      missing: required.size,
      total: required.size,
      status: "error",
      note: `Missing local credentials: ${missingEnv.join(", ")}`,
      missingKeys: Array.from(required).sort(),
    };
  }

  try {
    const secrets = await listSecrets();
    const present = new Set(secrets.map((secret) => secret.name));
    const missingKeys = Array.from(required).filter((key) => !present.has(key))
      .sort();
    const presentCount = required.size - missingKeys.length;

    return {
      provider: "supabase",
      present: presentCount,
      missing: missingKeys.length,
      total: required.size,
      status: missingKeys.length === 0 ? "ok" : "missing",
      missingKeys,
    };
  } catch (error) {
    return {
      provider: "supabase",
      present: 0,
      missing: required.size,
      total: required.size,
      status: "error",
      note: error instanceof Error ? error.message : "Unknown Supabase error",
      missingKeys: Array.from(required).sort(),
    };
  }
}

(async () => {
  const envMap = await loadEnvMap();
  const providerMap = groupByProvider(envMap);

  console.log("Provider summary");
  console.log("----------------");

  const supabaseRequired = providerMap.get("supabase") ?? new Set<string>();
  const supabaseSummary = await supabaseReport(supabaseRequired);
  const icon = supabaseSummary.status === "ok"
    ? "✅"
    : supabaseSummary.status === "missing"
    ? "❌"
    : "⚠️";
  console.log(
    `${icon} Supabase: ${supabaseSummary.present}/${supabaseSummary.total} present${
      supabaseSummary.missing > 0 ? `, missing ${supabaseSummary.missing}` : ""
    }`,
  );
  if (supabaseSummary.missingKeys.length > 0) {
    console.log(`   Missing keys: ${supabaseSummary.missingKeys.join(", ")}`);
  }
  if (supabaseSummary.note) {
    console.log(`   Note: ${supabaseSummary.note}`);
  }

  for (
    const provider of Array.from(providerMap.keys()).filter((p) =>
      p !== "supabase"
    )
  ) {
    const total = providerMap.get(provider)?.size ?? 0;
    const badge = total === 0 ? "—" : "ℹ️";
    console.log(
      `${badge} ${provider}: ${total} keys tracked (sync via env:sync)`,
    );
  }

  console.log("\nApplication summary");
  console.log("--------------------");

  const appChecks = await loadAppModules();
  for (const check of appChecks) {
    const missingPublic = check.missing.public.length;
    const missingServer = check.missing.server.length;
    const missingTotal = missingPublic + missingServer;
    const statusIcon = missingTotal === 0 ? "✅" : "❌";
    console.log(`${statusIcon} ${check.app}:`);
    console.log(
      `   Public missing: ${
        missingPublic === 0 ? "none" : check.missing.public.join(", ")
      }`,
    );
    console.log(
      `   Server missing: ${
        missingServer === 0 ? "none" : check.missing.server.join(", ")
      }`,
    );
  }

  if (
    supabaseSummary.status === "ok" &&
    appChecks.every((check) =>
      check.missing.public.length === 0 && check.missing.server.length === 0
    )
  ) {
    console.log("\nENV OK");
  } else {
    console.log(
      "\nReview missing keys above and update Supabase via `supabase secrets set NAME=<value>` as needed.",
    );
  }
})();
