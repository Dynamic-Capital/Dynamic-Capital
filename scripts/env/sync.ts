#!/usr/bin/env tsx
import { listSecrets } from "./supabase.ts";
import { groupByProvider, loadEnvMap } from "./utils.ts";

type ProviderStatus = {
  provider: string;
  status: "ok" | "missing" | "pending" | "error";
  missing?: string[];
  note?: string;
};

(async () => {
  const envMap = await loadEnvMap();
  const providerMap = groupByProvider(envMap);

  const matrix: ProviderStatus[] = [];
  const providerHints: Record<string, string> = {
    vercel:
      "Use `vercel env pull` to inspect current values and `vercel env add <KEY> production` (repeat for preview/dev) to register secrets, including underscore-prefixed names.",
    droplet:
      "Run `node scripts/digitalocean/sync-site-config.mjs --app-id <id> --site-url <url> --apply` after Supabase is the source of truth so the App Platform spec references the gateway tokens.",
  };

  const supabaseRequired = providerMap.get("supabase") ?? new Set<string>();
  const missingEnv: string[] = [];
  if (!process.env.SUPABASE_PROJECT_REF) {
    missingEnv.push("SUPABASE_PROJECT_REF");
  }
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    missingEnv.push("SUPABASE_ACCESS_TOKEN");
  }

  if (missingEnv.length > 0) {
    matrix.push({
      provider: "supabase",
      status: "error",
      missing: Array.from(supabaseRequired).sort(),
      note: `Missing local Supabase credentials: ${missingEnv.join(", ")}`,
    });
  } else {
    try {
      const secrets = await listSecrets();
      const present = new Set(secrets.map((secret) => secret.name));
      const missing = Array.from(supabaseRequired).filter((key) =>
        !present.has(key)
      ).sort();
      matrix.push({
        provider: "supabase",
        status: missing.length === 0 ? "ok" : "missing",
        missing,
        note: missing.length === 0
          ? "Supabase is the source of truth; downstream providers can be updated."
          : "Populate these keys via `supabase secrets set NAME=<value>` before syncing downstream.",
      });
    } catch (error) {
      matrix.push({
        provider: "supabase",
        status: "error",
        missing: Array.from(supabaseRequired).sort(),
        note: error instanceof Error ? error.message : "Unknown Supabase error",
      });
    }
  }

  for (
    const provider of Array.from(providerMap.keys()).filter((name) =>
      name !== "supabase"
    )
  ) {
    const trackedKeys = Array.from(providerMap.get(provider) ?? []).sort();
    matrix.push({
      provider,
      status: "pending",
      missing: trackedKeys,
      note: providerHints[provider] ??
        "Configure provider API credentials and extend this script to push values from Supabase. Secrets are not pulled directly.",
    });
  }

  console.log("Provider sync matrix");
  console.log("--------------------");

  for (const entry of matrix) {
    const icon = entry.status === "ok"
      ? "✅"
      : entry.status === "missing"
      ? "❌"
      : entry.status === "pending"
      ? "⏳"
      : "⚠️";
    const parts = [`${icon} ${entry.provider}`];
    if (entry.missing && entry.missing.length > 0) {
      parts.push(`missing: ${entry.missing.join(", ")}`);
    }
    console.log(parts.join(" — "));
    if (entry.note) {
      console.log(`   ${entry.note}`);
    }
  }

  const supabaseState = matrix.find((entry) => entry.provider === "supabase");
  if (!supabaseState || supabaseState.status !== "ok") {
    console.error(
      "\nSupabase must be fully populated before syncing to other providers.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nSupabase secrets ready. Configure provider-specific automation to complete downstream sync.",
  );
})();
