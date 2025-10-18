#!/usr/bin/env tsx
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";
import { listSecrets, setSecrets } from "./supabase.ts";
import { groupByProvider, loadEnvMap } from "./utils.ts";

type ProviderStatus = {
  provider: string;
  status: "ok" | "missing" | "pending" | "error";
  missing?: string[];
  note?: string;
};

const ENV_FILES = [".env.local", ".env"];

function sanitize(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const lowered = trimmed.toLowerCase();
  if (trimmed === "" || lowered === "undefined" || lowered === "null") {
    return null;
  }
  return trimmed;
}

function hydrateEnvFromFiles(files: readonly string[]): void {
  for (const candidate of files) {
    try {
      const filePath = resolve(candidate);
      if (!existsSync(filePath)) continue;
      const contents = readFileSync(filePath, "utf8");
      const parsed = parseDotenv(contents);
      for (const [key, rawValue] of Object.entries(parsed)) {
        const value = sanitize(rawValue);
        if (!value) continue;
        const current = sanitize(process.env[key]);
        if (current) continue;
        process.env[key] = value;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load ${candidate}:`, error);
    }
  }
}

function snapshotEnv(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(process.env)) {
    const value = sanitize(rawValue);
    if (!value) continue;
    snapshot[key] = value;
  }
  return snapshot;
}

hydrateEnvFromFiles(ENV_FILES);

const cliArgs = new Set(process.argv.slice(2));
let applyMode = cliArgs.has("--apply");

if (applyMode) {
  const required = ["SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN"] as const;
  const missing = required.filter((key) => !sanitize(process.env[key]));
  if (missing.length > 0) {
    console.warn(
      `⚠️ Cannot auto-sync Supabase secrets; missing ${missing.join(", ")}.`,
    );
    applyMode = false;
  }
}

const envSnapshot = applyMode ? snapshotEnv() : {};

if (applyMode) {
  console.log("Auto apply mode enabled: missing Supabase secrets will be set.");
}

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

  const autoApply = applyMode;
  const localSnapshot = envSnapshot;

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
      let present = new Set(secrets.map((secret) => secret.name));
      let missing = Array.from(supabaseRequired).filter((key) =>
        !present.has(key)
      ).sort();
      const noteParts: string[] = [];

      if (autoApply && missing.length > 0) {
        const toSet: Record<string, string> = {};
        const unresolved: string[] = [];
        for (const key of missing) {
          const value = typeof localSnapshot[key] === "string"
            ? localSnapshot[key]
            : undefined;
          if (value && value.trim() !== "") {
            toSet[key] = value;
          } else {
            unresolved.push(key);
          }
        }

        const keysToSet = Object.keys(toSet);
        if (keysToSet.length > 0) {
          console.log(
            `Attempting to auto-sync ${keysToSet.length} Supabase secret(s)...`,
          );
          try {
            await setSecrets(toSet);
            const refreshed = await listSecrets();
            present = new Set(refreshed.map((secret) => secret.name));
            missing = Array.from(supabaseRequired).filter((key) =>
              !present.has(key)
            ).sort();
            noteParts.push(
              `Auto-synced ${keysToSet.length} secret${
                keysToSet.length > 1 ? "s" : ""
              } from local env.`,
            );
          } catch (error) {
            const message = error instanceof Error
              ? error.message
              : "Unknown Supabase error";
            noteParts.push(`Auto sync failed: ${message}`);
          }
        }

        if (unresolved.length > 0) {
          noteParts.push(
            `Missing local values for ${unresolved.join(", ")}.`,
          );
        }
      }

      const status = missing.length === 0 ? "ok" : "missing";
      const note = noteParts.length > 0
        ? noteParts.join(" ")
        : status === "ok"
        ? "Supabase is the source of truth; downstream providers can be updated."
        : "Populate these keys via `supabase secrets set NAME=<value>` before syncing downstream.";

      matrix.push({
        provider: "supabase",
        status,
        missing,
        note,
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
