#!/usr/bin/env -S deno run -A
import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.1?dts";

interface SyncSourceConfig {
  id: string;
  displayName: string;
  observedLatencyMs: number;
  observedJitterMs: number;
  observedOffsetMs: number;
}

interface SyncConfig {
  horizonMinutes: number;
  maxJitterSeconds: number;
  offsetToleranceMs: number;
  targetLatencyMs: number;
  sources: SyncSourceConfig[];
}

interface ExportTargetConfig {
  core: string;
  displayName: string;
  provider: string;
  link: string;
  capacityGb: number;
  usedGb: number;
  pendingGb: number;
  syncSource: string;
  sustainedThroughputMbps: number;
  priority?: "low" | "medium" | "high";
}

interface ExportConfig {
  batchSizeGb: number;
  maxParallel: number;
  targets: ExportTargetConfig[];
}

interface MemorySyncConfig {
  sync: SyncConfig;
  export: ExportConfig;
}

interface ExportPlanEntry {
  core: string;
  displayName: string;
  provider: string;
  link: string;
  priority: "low" | "medium" | "high";
  backlogGb: number;
  availableGb: number;
  recommendedBatchGb: number;
  batchesRequired: number;
  recommendedParallelism: number;
  estimatedDurationMinutes: number;
  syncHealth: number;
  score: number;
  issues: string[];
}

interface SupabaseSyncOptions {
  url: string;
  serviceRoleKey: string;
}

interface SupabaseSyncResult {
  coresProcessed: number;
  snapshotsInserted: number;
}

interface MemoryCoreRow {
  id: string;
  display_name: string;
  provider: string;
  link: string;
  capacity_gb: number;
  used_gb: number;
  pending_gb: number;
  sync_source: string;
  sustained_throughput_mbps: number;
  priority: "low" | "medium" | "high";
  updated_at: string;
}

interface MemorySyncSnapshotRow {
  core_id: string;
  captured_at: string;
  observed_latency_ms: number | null;
  observed_jitter_ms: number | null;
  observed_offset_ms: number | null;
  backlog_gb: number;
  available_gb: number;
  recommended_batch_gb: number;
  batches_required: number;
  recommended_parallelism: number;
  estimated_duration_minutes: number;
  sync_health: number;
  score: number;
  issues: string[];
  target_latency_ms: number;
  max_jitter_seconds: number;
  offset_tolerance_ms: number;
  horizon_minutes: number;
}

function readStringFlag(
  flags: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = flags[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function asNumber(value: unknown, message: string): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(message);
  }
  return result;
}

function asString(value: unknown, message: string): string {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadConfiguration(path: string): Promise<MemorySyncConfig> {
  const content = await Deno.readTextFile(path);
  const raw = JSON.parse(content);
  assert(
    typeof raw === "object" && raw !== null,
    "Configuration root must be an object",
  );

  const syncRaw = (raw as Record<string, unknown>).sync;
  assert(
    typeof syncRaw === "object" && syncRaw !== null,
    "Missing sync configuration",
  );
  const exportRaw = (raw as Record<string, unknown>).export;
  assert(
    typeof exportRaw === "object" && exportRaw !== null,
    "Missing export configuration",
  );

  const syncConfig = syncRaw as Record<string, unknown>;
  const exportConfig = exportRaw as Record<string, unknown>;

  const sourcesRaw = syncConfig.sources;
  assert(
    Array.isArray(sourcesRaw) && sourcesRaw.length > 0,
    "Sync configuration requires sources",
  );

  const targetsRaw = exportConfig.targets;
  assert(
    Array.isArray(targetsRaw) && targetsRaw.length > 0,
    "Export configuration requires targets",
  );

  const sync: SyncConfig = {
    horizonMinutes: asNumber(
      syncConfig.horizonMinutes,
      "sync.horizonMinutes must be numeric",
    ),
    maxJitterSeconds: asNumber(
      syncConfig.maxJitterSeconds,
      "sync.maxJitterSeconds must be numeric",
    ),
    offsetToleranceMs: asNumber(
      syncConfig.offsetToleranceMs,
      "sync.offsetToleranceMs must be numeric",
    ),
    targetLatencyMs: asNumber(
      syncConfig.targetLatencyMs,
      "sync.targetLatencyMs must be numeric",
    ),
    sources: (sourcesRaw as Record<string, unknown>[]).map((item) => ({
      id: asString(item.id, "sync source id is required"),
      displayName: asString(
        item.displayName,
        "sync source displayName is required",
      ),
      observedLatencyMs: asNumber(
        item.observedLatencyMs,
        "sync source observedLatencyMs must be numeric",
      ),
      observedJitterMs: asNumber(
        item.observedJitterMs,
        "sync source observedJitterMs must be numeric",
      ),
      observedOffsetMs: asNumber(
        item.observedOffsetMs,
        "sync source observedOffsetMs must be numeric",
      ),
    })),
  };

  const exportCfg: ExportConfig = {
    batchSizeGb: asNumber(
      exportConfig.batchSizeGb,
      "export.batchSizeGb must be numeric",
    ),
    maxParallel: Math.max(
      1,
      Math.floor(
        asNumber(
          exportConfig.maxParallel,
          "export.maxParallel must be numeric",
        ),
      ),
    ),
    targets: (targetsRaw as Record<string, unknown>[]).map((item) => ({
      core: asString(item.core, "export target core is required"),
      displayName: asString(
        item.displayName,
        "export target displayName is required",
      ),
      provider: asString(item.provider, "export target provider is required"),
      link: asString(item.link, "export target link is required"),
      capacityGb: asNumber(
        item.capacityGb,
        "export target capacityGb must be numeric",
      ),
      usedGb: asNumber(item.usedGb, "export target usedGb must be numeric"),
      pendingGb: asNumber(
        item.pendingGb,
        "export target pendingGb must be numeric",
      ),
      syncSource: asString(
        item.syncSource,
        "export target syncSource is required",
      ),
      sustainedThroughputMbps: asNumber(
        item.sustainedThroughputMbps,
        "export target sustainedThroughputMbps must be numeric",
      ),
      priority: ((): "low" | "medium" | "high" => {
        const value = item.priority ?? "medium";
        if (value === "low" || value === "medium" || value === "high") {
          return value;
        }
        throw new Error(
          `export target priority must be low, medium, or high (got ${value})`,
        );
      })(),
    })),
  };

  return { sync, export: exportCfg };
}

function computeSyncHealth(source: SyncSourceConfig, sync: SyncConfig): number {
  const jitterLimitMs = Math.max(sync.maxJitterSeconds * 1000, 1);
  const offsetLimitMs = Math.max(sync.offsetToleranceMs, 1);
  const latencyLimitMs = Math.max(sync.targetLatencyMs, 1);

  const jitterScore = Math.max(0, 1 - source.observedJitterMs / jitterLimitMs);
  const offsetScore = Math.max(
    0,
    1 - Math.abs(source.observedOffsetMs) / offsetLimitMs,
  );
  const latencyScore = Math.max(
    0,
    1 - source.observedLatencyMs / latencyLimitMs,
  );

  return Math.max(
    0,
    Math.min(
      1,
      (jitterScore * 0.4) + (offsetScore * 0.2) + (latencyScore * 0.4),
    ),
  );
}

function computePriorityBoost(priority: "low" | "medium" | "high"): number {
  switch (priority) {
    case "high":
      return 0.2;
    case "medium":
      return 0.1;
    case "low":
    default:
      return 0;
  }
}

function computePlan(config: MemorySyncConfig): ExportPlanEntry[] {
  const sources = new Map(
    config.sync.sources.map((source) => [source.id, source]),
  );

  const plan = config.export.targets.map((target) => {
    const source = sources.get(target.syncSource);
    if (!source) {
      throw new Error(
        `Unknown sync source '${target.syncSource}' for target ${target.core}`,
      );
    }

    const availableGb = Math.max(target.capacityGb - target.usedGb, 0);
    const backlogGb = Math.max(target.pendingGb, 0);
    const syncHealth = computeSyncHealth(source, config.sync);
    const priorityBoost = computePriorityBoost(target.priority ?? "medium");
    const capacityScore = target.capacityGb > 0
      ? availableGb / target.capacityGb
      : 0;

    const score = Math.max(
      0,
      Math.min(1, (capacityScore * 0.5) + (syncHealth * 0.35) + priorityBoost),
    );

    const effectiveBatchGb = backlogGb > 0
      ? Math.min(
        config.export.batchSizeGb,
        Math.max(Math.min(backlogGb, availableGb || backlogGb), 0),
      )
      : 0;

    const recommendedParallelism = backlogGb > 0
      ? Math.max(
        1,
        Math.min(
          config.export.maxParallel,
          Math.round(syncHealth * config.export.maxParallel) || 1,
        ),
      )
      : 0;

    const batchesRequired = effectiveBatchGb > 0
      ? Math.max(1, Math.ceil(backlogGb / effectiveBatchGb))
      : 0;

    const estimatedDurationMinutes =
      effectiveBatchGb > 0 && target.sustainedThroughputMbps > 0
        ? ((effectiveBatchGb * 1024 * 8) / target.sustainedThroughputMbps) / 60
        : 0;

    const issues: string[] = [];
    if (availableGb <= 0) {
      issues.push(
        "No free capacity available — export backlog cannot be processed",
      );
    } else if (availableGb < backlogGb) {
      issues.push(
        `Backlog exceeds free capacity by ${
          (backlogGb - availableGb).toFixed(2)
        } GB`,
      );
    }
    if (syncHealth < 0.5) {
      issues.push(
        "Sync health is degraded — monitor latency and jitter before exporting",
      );
    }

    return {
      core: target.core,
      displayName: target.displayName,
      provider: target.provider,
      link: target.link,
      priority: target.priority ?? "medium",
      backlogGb,
      availableGb,
      recommendedBatchGb: effectiveBatchGb,
      batchesRequired,
      recommendedParallelism,
      estimatedDurationMinutes,
      syncHealth,
      score,
      issues,
    };
  });

  return plan.sort((a, b) => {
    if (b.score === a.score) {
      return b.backlogGb - a.backlogGb;
    }
    return b.score - a.score;
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return value.toFixed(2);
}

function printPlan(plan: ExportPlanEntry[], config: MemorySyncConfig): void {
  console.log("Optimized memory sync export plan");
  console.log(
    `Batch size target: ${
      formatNumber(config.export.batchSizeGb)
    } GB (max parallel ${config.export.maxParallel})`,
  );

  plan.forEach((entry, index) => {
    console.log(
      `\n${index + 1}. ${entry.displayName} [${entry.core}] — score ${
        formatPercent(entry.score)
      }`,
    );
    console.log(`   Provider: ${entry.provider}`);
    console.log(`   Link: ${entry.link}`);
    console.log(`   Priority: ${entry.priority}`);
    console.log(
      `   Pending backlog: ${
        formatNumber(entry.backlogGb)
      } GB across ${entry.batchesRequired} batch(es) @ ${
        formatNumber(entry.recommendedBatchGb)
      } GB`,
    );
    console.log(`   Free capacity: ${formatNumber(entry.availableGb)} GB`);
    console.log(
      `   Sync health: ${formatPercent(entry.syncHealth)} (parallelism ${
        entry.recommendedParallelism || 0
      })`,
    );
    console.log(
      `   Estimated batch duration: ${
        formatNumber(entry.estimatedDurationMinutes)
      } minutes per stream at ${formatNumber(entry.recommendedBatchGb)} GB`,
    );
    if (entry.issues.length > 0) {
      for (const issue of entry.issues) {
        console.log(`   ⚠️  ${issue}`);
      }
    }
  });
}

async function syncPlanToSupabase(
  plan: ExportPlanEntry[],
  config: MemorySyncConfig,
  options: SupabaseSyncOptions,
): Promise<SupabaseSyncResult> {
  const client = createClient(options.url, options.serviceRoleKey, {
    auth: { persistSession: false },
  });

  const nowIso = new Date().toISOString();
  const sourceMap = new Map(config.sync.sources.map((source) => [
    source.id,
    source,
  ]));
  const targetMap = new Map(config.export.targets.map((target) => [
    target.core,
    target,
  ]));

  const coreRows: MemoryCoreRow[] = config.export.targets.map((target) => ({
    id: target.core,
    display_name: target.displayName,
    provider: target.provider,
    link: target.link,
    capacity_gb: target.capacityGb,
    used_gb: target.usedGb,
    pending_gb: target.pendingGb,
    sync_source: target.syncSource,
    sustained_throughput_mbps: target.sustainedThroughputMbps,
    priority: target.priority ?? "medium",
    updated_at: nowIso,
  }));

  const { error: coreError } = await client.from<MemoryCoreRow>("memory_cores")
    .upsert(coreRows, {
      onConflict: "id",
    });
  if (coreError) {
    throw new Error(`Failed to upsert memory cores: ${coreError.message}`);
  }

  const snapshotRows: MemorySyncSnapshotRow[] = plan.map((entry) => {
    const target = targetMap.get(entry.core);
    const source = target ? sourceMap.get(target.syncSource) : undefined;
    return {
      core_id: entry.core,
      captured_at: nowIso,
      observed_latency_ms: source?.observedLatencyMs ?? null,
      observed_jitter_ms: source?.observedJitterMs ?? null,
      observed_offset_ms: source?.observedOffsetMs ?? null,
      backlog_gb: entry.backlogGb,
      available_gb: entry.availableGb,
      recommended_batch_gb: entry.recommendedBatchGb,
      batches_required: entry.batchesRequired,
      recommended_parallelism: entry.recommendedParallelism,
      estimated_duration_minutes: entry.estimatedDurationMinutes,
      sync_health: entry.syncHealth,
      score: entry.score,
      issues: entry.issues,
      target_latency_ms: config.sync.targetLatencyMs,
      max_jitter_seconds: config.sync.maxJitterSeconds,
      offset_tolerance_ms: config.sync.offsetToleranceMs,
      horizon_minutes: config.sync.horizonMinutes,
    };
  });

  if (snapshotRows.length > 0) {
    const { error: snapshotError } = await client
      .from<MemorySyncSnapshotRow>("memory_sync_snapshots")
      .insert(snapshotRows);
    if (snapshotError) {
      throw new Error(
        `Failed to insert memory sync snapshots: ${snapshotError.message}`,
      );
    }
  }

  return {
    coresProcessed: coreRows.length,
    snapshotsInserted: snapshotRows.length,
  };
}

async function main(): Promise<void> {
  const flags = parse(Deno.args, {
    string: ["config", "supabase-url", "supabase-key"],
    boolean: ["json", "help", "sync-supabase"],
    alias: {
      c: "config",
      j: "json",
      h: "help",
      s: "sync-supabase",
      u: "supabase-url",
      k: "supabase-key",
    },
  });

  if (flags.help) {
    console.log(
      "Usage: deno run -A scripts/ops/optimize-memory-sync.ts [--config path] [--json]",
    );
    console.log(
      "  --config, -c   Path to memory sync configuration file (default config/memory-sync.config.json)",
    );
    console.log("  --json, -j     Emit JSON instead of human readable output");
    console.log(
      "  --sync-supabase, -s  Upsert memory cores and record a snapshot in Supabase",
    );
    console.log(
      "  --supabase-url, -u    Supabase project URL (defaults to SUPABASE_URL)",
    );
    console.log(
      "  --supabase-key, -k    Supabase service role key (defaults to SUPABASE_SERVICE_ROLE_KEY)",
    );
    console.log("  --help, -h     Show this message");
    return;
  }

  const configPath =
    typeof flags.config === "string" && flags.config.trim().length > 0
      ? flags.config
      : "config/memory-sync.config.json";
  const emitJson = Boolean(flags.json);
  const syncSupabase = Boolean(flags["sync-supabase"]);

  const config = await loadConfiguration(configPath);
  const plan = computePlan(config);

  let supabaseResult: SupabaseSyncResult | undefined;
  if (syncSupabase) {
    const supabaseUrl = readStringFlag(
      flags as Record<string, unknown>,
      "supabase-url",
      "supabaseUrl",
    ) ??
      Deno.env.get("SUPABASE_URL") ??
      Deno.env.get("SUPABASE_PROJECT_URL");
    if (!supabaseUrl) {
      throw new Error(
        "Supabase URL is required via --supabase-url or SUPABASE_URL",
      );
    }
    const supabaseKey = readStringFlag(
      flags as Record<string, unknown>,
      "supabase-key",
      "supabaseKey",
    ) ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseKey) {
      throw new Error(
        "Supabase service role key is required via --supabase-key or SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    supabaseResult = await syncPlanToSupabase(plan, config, {
      url: supabaseUrl,
      serviceRoleKey: supabaseKey,
    });
  }

  if (emitJson) {
    const supabaseMeta = supabaseResult
      ? {
        synced: true,
        coresProcessed: supabaseResult.coresProcessed,
        snapshotsInserted: supabaseResult.snapshotsInserted,
      }
      : { synced: false };
    console.log(JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        configPath,
        plan,
        supabase: supabaseMeta,
      },
      null,
      2,
    ));
    return;
  }

  printPlan(plan, config);
  if (supabaseResult) {
    console.log(
      `\n✓ Synced ${supabaseResult.coresProcessed} core(s) and ${supabaseResult.snapshotsInserted} snapshot(s) to Supabase`,
    );
  }
}

if (import.meta.main) {
  await main();
}
