#!/usr/bin/env tsx

import { listSecrets } from "./supabase.ts";
import { groupByProvider, loadAppModules, loadEnvMap } from "./utils.ts";

type ProviderSummary = {
  provider: string;
  missing: string[];
  present: string[];
  status: "ok" | "missing" | "error";
  message?: string;
};

async function validateSupabase(
  required: Set<string>,
): Promise<ProviderSummary> {
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
      missing: Array.from(required).sort(),
      present: [],
      status: "error",
      message: `Missing local credentials to query Supabase: ${
        missingEnv.join(", ")
      }`,
    };
  }

  try {
    const secrets = await listSecrets();
    const present = new Set(secrets.map((secret) => secret.name));
    const missing = Array.from(required).filter((key) => !present.has(key))
      .sort();
    const satisfied = Array.from(required).filter((key) => present.has(key))
      .sort();

    return {
      provider: "supabase",
      missing,
      present: satisfied,
      status: missing.length === 0 ? "ok" : "missing",
    };
  } catch (error) {
    return {
      provider: "supabase",
      missing: Array.from(required).sort(),
      present: [],
      status: "error",
      message: error instanceof Error
        ? error.message
        : "Unknown Supabase error",
    };
  }
}

function printProviderSummary(summary: ProviderSummary): void {
  const icon = summary.status === "ok"
    ? "✅"
    : summary.status === "missing"
    ? "❌"
    : "⚠️";
  console.log(`\n${icon} Supabase secrets`);

  if (summary.status === "error" && summary.message) {
    console.log(`   ${summary.message}`);
  }

  if (summary.present.length > 0) {
    console.log(
      `   Present (${summary.present.length}): ${summary.present.join(", ")}`,
    );
  }

  if (summary.missing.length > 0) {
    console.log(
      `   Missing (${summary.missing.length}): ${summary.missing.join(", ")}`,
    );
    console.log(
      "   Set via: supabase secrets set " +
        summary.missing.map((key) => `${key}=<value>`).join(" ") +
        " --project-ref $SUPABASE_PROJECT_REF",
    );
  }
}

(async () => {
  const envMap = await loadEnvMap();
  const providerMap = groupByProvider(envMap);

  const supabaseRequired = providerMap.get("supabase") ?? new Set<string>();
  const supabaseSummary = await validateSupabase(supabaseRequired);
  printProviderSummary(supabaseSummary);

  const otherProviders = Array.from(providerMap.keys()).filter((provider) =>
    provider !== "supabase"
  );
  if (otherProviders.length > 0) {
    console.log(
      "\nℹ️  Additional providers configured in env.map.json:",
      otherProviders.join(", "),
    );
    console.log(
      "    Run `npm run env:sync` once Supabase secrets are up to date to propagate values.",
    );
  }

  const appResults = await loadAppModules();
  for (const result of appResults) {
    const hasMissing = result.missing.public.length > 0 ||
      result.missing.server.length > 0;
    const icon = hasMissing ? "❌" : "✅";
    console.log(`\n${icon} App: ${result.app}`);
    if (result.missing.public.length > 0) {
      console.log(`   Public missing: ${result.missing.public.join(", ")}`);
    }
    if (result.missing.server.length > 0) {
      console.log(`   Server missing: ${result.missing.server.join(", ")}`);
    }
    if (!hasMissing) {
      console.log("   All required variables are present.");
    }
  }

  const missingProviderKeys = supabaseSummary.status !== "ok"
    ? supabaseSummary.missing
    : [];
  const missingAppKeys = appResults
    .flatMap((entry) => [...entry.missing.public, ...entry.missing.server])
    .filter((key, index, arr) => arr.indexOf(key) === index);

  if (supabaseSummary.status === "error") {
    console.error(
      "\nSupabase validation failed. Configure the local CLI credentials and re-run the check.",
    );
    process.exitCode = 1;
    return;
  }

  if (missingProviderKeys.length === 0 && missingAppKeys.length === 0) {
    console.log("\nENV OK");
    return;
  }

  if (missingProviderKeys.length > 0) {
    console.error(
      `\nSupabase secrets missing: ${missingProviderKeys.join(", ")}`,
    );
  }

  if (missingAppKeys.length > 0) {
    console.error(`\nApplication env missing: ${missingAppKeys.join(", ")}`);
  }

  process.exitCode = 1;
})();
