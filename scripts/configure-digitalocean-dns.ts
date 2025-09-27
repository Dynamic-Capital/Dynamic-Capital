#!/usr/bin/env -S deno run -A

/**
 * Configure DigitalOcean DNS records for Dynamic Capital using the `doctl` CLI.
 *
 * Usage:
 *   deno run -A scripts/configure-digitalocean-dns.ts [--domain=<domain>] [--config=<path>] [--dry-run] [--prune] [--state=<json>] [--context=<name>]
 *
 * - `--domain` overrides the domain in the config file.
 * - `--config` points at a JSON file describing the desired records.
 * - `--dry-run` only prints the planned changes without calling `doctl`.
 * - `--prune` deletes managed records that are not present in the config.
 * - `--state` supplies existing records as JSON (skips calling `doctl list`).
 */

interface RecordSpec {
  type: string;
  name: string;
  data: string;
  ttl?: number;
  priority?: number;
}

interface DomainConfig {
  domain: string;
  records: RecordSpec[];
}

interface DomainRecord extends RecordSpec {
  id: number;
  weight?: number;
  flags?: number;
  tag?: string;
}

interface CliOptions {
  domain?: string;
  configPath?: string;
  dryRun: boolean;
  prune: boolean;
  statePath?: string;
  context?: string;
}

const DEFAULT_DOMAIN = "dynamic-capital.lovable.app";
const DEFAULT_CONFIG_PATH = new URL(
  "../dns/dynamic-capital.lovable.app.json",
  import.meta.url,
).pathname;

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = {
    dryRun: false,
    prune: false,
  };
  for (const arg of args) {
    if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--prune") {
      opts.prune = true;
    } else if (arg.startsWith("--domain=")) {
      opts.domain = arg.split("=", 2)[1];
    } else if (arg.startsWith("--config=")) {
      opts.configPath = arg.split("=", 2)[1];
    } else if (arg.startsWith("--state=")) {
      opts.statePath = arg.split("=", 2)[1];
    } else if (arg.startsWith("--context=")) {
      opts.context = arg.split("=", 2)[1];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Configure DigitalOcean DNS records via doctl.

Options:
  --domain=<domain>   Override the domain from the config file.
  --config=<path>     Path to JSON config describing desired records.
  --state=<path>      Read existing records from JSON instead of doctl.
  --dry-run           Only show the plan (do not call doctl mutate commands).
  --prune             Delete managed records that are not in the config.
  --context=<name>    Use a specific doctl context for all commands.
`);
      Deno.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      Deno.exit(1);
    }
  }
  return opts;
}

function validateConfig(config: DomainConfig): void {
  if (!config || typeof config !== "object") {
    throw new Error("Config must be an object.");
  }
  if (!config.domain || typeof config.domain !== "string") {
    throw new Error("Config must include a domain string.");
  }
  if (!Array.isArray(config.records)) {
    throw new Error("Config must include a records array.");
  }
  for (const record of config.records) {
    if (!record.type) throw new Error("Record missing type");
    if (!record.name) throw new Error("Record missing name");
    if (!record.data) throw new Error("Record missing data");
  }
}

function normalizeName(name: string): string {
  if (name === "" || name === "@") return "@";
  return name.toLowerCase();
}

function normalizeData(type: string, data: string): string {
  if (type === "CNAME" || type === "NS" || type === "MX") {
    return data.replace(/\.$/, "").toLowerCase();
  }
  return data;
}

async function loadConfig(path?: string): Promise<DomainConfig> {
  if (path) {
    const text = await Deno.readTextFile(path);
    const config = JSON.parse(text) as DomainConfig;
    validateConfig(config);
    return config;
  }
  try {
    const text = await Deno.readTextFile(DEFAULT_CONFIG_PATH);
    const config = JSON.parse(text) as DomainConfig;
    validateConfig(config);
    return config;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      // Fall back to built-in defaults.
      const defaults: DomainConfig = {
        domain: DEFAULT_DOMAIN,
        records: [
          { type: "A", name: "@", data: "162.159.140.98", ttl: 3600 },
          { type: "A", name: "@", data: "172.66.0.96", ttl: 3600 },
          {
            type: "CNAME",
            name: "www",
            data: "dynamic-capital.lovable.app",
            ttl: 3600,
          },
          {
            type: "CNAME",
            name: "api",
            data: "dynamic-capital.lovable.app",
            ttl: 3600,
          },
        ],
      };
      return defaults;
    }
    throw err;
  }
}

async function readExistingRecords(
  domain: string,
  statePath: string | undefined,
  context: string | undefined,
): Promise<DomainRecord[]> {
  if (statePath) {
    const text = await Deno.readTextFile(statePath);
    const parsed = JSON.parse(text) as DomainRecord[];
    return parsed.map((record) => ({
      ...record,
      name: normalizeName(record.name),
      data: normalizeData(record.type, record.data),
    }));
  }
  const output = await runDoctl([
    "compute",
    "domain",
    "records",
    "list",
    domain,
    "--output",
    "json",
  ], context);
  const parsed = JSON.parse(output) as DomainRecord[];
  return parsed.map((record) => ({
    ...record,
    name: normalizeName(record.name),
    data: normalizeData(record.type, record.data),
  }));
}

async function runDoctl(
  args: string[],
  context: string | undefined,
): Promise<string> {
  try {
    const finalArgs = context ? ["--context", context, ...args] : args;
    const command = new Deno.Command("doctl", {
      args: finalArgs,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await command.output();
    if (code !== 0) {
      const errText = new TextDecoder().decode(stderr);
      throw new Error(
        `doctl ${finalArgs.join(" ")} failed (exit ${code}): ${errText}`,
      );
    }
    return new TextDecoder().decode(stdout);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "doctl executable not found. Install it from https://docs.digitalocean.com/reference/doctl/how-to/install/.",
      );
    }
    throw error;
  }
}

interface PlannedAction {
  type: "create" | "update" | "delete";
  record: RecordSpec;
  existing?: DomainRecord;
}

function planChanges(
  desiredRecords: RecordSpec[],
  existingRecords: DomainRecord[],
  prune: boolean,
): PlannedAction[] {
  const plan: PlannedAction[] = [];
  const usedIds = new Set<number>();

  const normalizedDesired = desiredRecords.map((record) => ({
    ...record,
    name: normalizeName(record.name),
    data: normalizeData(record.type, record.data),
  }));

  for (const desired of normalizedDesired) {
    const exactMatch = existingRecords.find((record) =>
      !usedIds.has(record.id) &&
      record.type === desired.type &&
      record.name === desired.name &&
      record.data === desired.data
    );

    if (exactMatch) {
      usedIds.add(exactMatch.id);
      if (desired.ttl && exactMatch.ttl !== desired.ttl) {
        plan.push({ type: "update", record: desired, existing: exactMatch });
      }
      continue;
    }

    const sameName = existingRecords.find((record) =>
      !usedIds.has(record.id) &&
      record.type === desired.type &&
      record.name === desired.name
    );

    if (sameName) {
      usedIds.add(sameName.id);
      plan.push({ type: "update", record: desired, existing: sameName });
    } else {
      plan.push({ type: "create", record: desired });
    }
  }

  for (const record of existingRecords) {
    if (usedIds.has(record.id)) continue;
    // Only manage records that share the same name/type as desired ones.
    const managed = normalizedDesired.some((desired) =>
      desired.type === record.type && desired.name === record.name
    );
    if (managed) {
      if (prune) {
        plan.push({ type: "delete", record: record, existing: record });
      } else {
        console.warn(
          `Found extra record (${record.type} ${record.name} ${record.data}); rerun with --prune to delete.`,
        );
      }
    }
  }

  return plan;
}

async function executePlan(
  domain: string,
  plan: PlannedAction[],
  dryRun: boolean,
  context: string | undefined,
): Promise<void> {
  if (plan.length === 0) {
    console.log("DNS records already match desired state.");
    return;
  }

  for (const action of plan) {
    if (action.type === "create") {
      const { record } = action;
      console.log(
        `${
          dryRun ? "[dry-run] Would create" : "Creating"
        } ${record.type} ${record.name} -> ${record.data}`,
      );
      if (!dryRun) {
        const args = [
          "compute",
          "domain",
          "records",
          "create",
          domain,
          "--record-type",
          record.type,
          "--record-name",
          record.name === "@" ? "@" : record.name,
          "--record-data",
          record.data,
        ];
        if (record.ttl) {
          args.push("--record-ttl", String(record.ttl));
        }
        if (record.priority) {
          args.push("--record-priority", String(record.priority));
        }
        await runDoctl(args, context);
      }
    } else if (action.type === "update" && action.existing) {
      const { record, existing } = action;
      console.log(
        `${
          dryRun ? "[dry-run] Would update" : "Updating"
        } record ${existing.id} (${existing.type} ${existing.name}) -> ${record.data}`,
      );
      if (!dryRun) {
        const args = [
          "compute",
          "domain",
          "records",
          "update",
          domain,
          String(existing.id),
          "--record-data",
          record.data,
        ];
        if (record.ttl) {
          args.push("--record-ttl", String(record.ttl));
        }
        if (record.name !== existing.name) {
          args.push("--record-name", record.name);
        }
        await runDoctl(args, context);
      }
    } else if (action.type === "delete" && action.existing) {
      console.log(
        `${
          dryRun ? "[dry-run] Would delete" : "Deleting"
        } record ${action.existing.id} (${action.existing.type} ${action.existing.name} ${action.existing.data})`,
      );
      if (!dryRun) {
        await runDoctl([
          "compute",
          "domain",
          "records",
          "delete",
          domain,
          String(action.existing.id),
          "--force",
        ], context);
      }
    }
  }
}

async function main() {
  const opts = parseArgs(Deno.args);
  const config = await loadConfig(opts.configPath);
  if (opts.domain) {
    config.domain = opts.domain;
  }

  const desiredRecords = config.records;
  const existing = await readExistingRecords(
    config.domain,
    opts.statePath,
    opts.context,
  );

  const plan = planChanges(desiredRecords, existing, opts.prune);
  await executePlan(config.domain, plan, opts.dryRun, opts.context);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err.message ?? err);
    Deno.exit(1);
  });
}
