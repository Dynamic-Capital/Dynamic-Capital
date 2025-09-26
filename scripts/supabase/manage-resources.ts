#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
import {
  isAbsolute,
  resolve as resolvePath,
  toFileUrl,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import type {
  ColumnDefinition,
  PolicyDefinition,
  ResourcePlan,
  StorageBucketDefinition,
  StoragePlan,
  StoragePolicyDefinition,
  TableDefinition,
} from "../../supabase/resource-schema.ts";

interface ManagerOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

class SupabaseResourceManager {
  private readonly apiBase: string;

  constructor(
    private readonly projectRef: string,
    private readonly accessToken: string,
    private readonly options: ManagerOptions = {},
  ) {
    this.apiBase = `https://api.supabase.com/v1/projects/${projectRef}`;
  }

  async apply(plan: ResourcePlan): Promise<void> {
    if (plan.tables?.length) {
      for (const table of plan.tables) {
        await this.ensureTable(table);
      }
    }

    if (plan.sql?.length) {
      for (const statement of plan.sql) {
        const label = statement.name ?? "custom-sql";
        await this.runSql(statement.statement, label);
      }
    }

    if (plan.storage) {
      await this.applyStoragePlan(plan.storage);
    }

    if (plan.storageBuckets?.length) {
      await this.ensureBuckets(plan.storageBuckets);
    }

    if (plan.storagePolicies?.length) {
      await this.ensureStoragePolicies(plan.storagePolicies);
    }
  }

  private async ensureTable(table: TableDefinition): Promise<void> {
    const schema = table.schema ?? "public";
    const qualified = qualifyName(schema, table.name);
    this.log(`→ ensuring table ${qualified}`);

    const statements = this.buildTableStatements(table);
    for (const statement of statements) {
      await this.runSql(statement, `table:${qualified}`);
    }
  }

  private async applyStoragePlan(plan: StoragePlan): Promise<void> {
    const statements: string[] = [];
    if (typeof plan.enableRowLevelSecurity === "boolean") {
      statements.push(
        `ALTER TABLE storage.objects ${
          plan.enableRowLevelSecurity ? "ENABLE" : "DISABLE"
        } ROW LEVEL SECURITY;`,
      );
    }
    if (typeof plan.forceRowLevelSecurity === "boolean") {
      statements.push(
        `ALTER TABLE storage.objects ${
          plan.forceRowLevelSecurity ? "FORCE" : "NO FORCE"
        } ROW LEVEL SECURITY;`,
      );
    }

    for (const statement of statements) {
      await this.runSql(statement, "storage:rls");
    }
  }

  private async ensureBuckets(
    buckets: StorageBucketDefinition[],
  ): Promise<void> {
    const existing = await this.request(
      "/storage/buckets",
      { method: "GET" },
    ) as Array<Record<string, unknown>> | undefined;
    const bucketMap = new Map<string, Record<string, unknown>>();
    for (const entry of existing ?? []) {
      const name = typeof entry.name === "string"
        ? entry.name
        : typeof entry.id === "string"
        ? entry.id
        : undefined;
      if (name) {
        bucketMap.set(name, entry);
      }
    }

    for (const bucket of buckets) {
      const current = bucketMap.get(bucket.name);
      if (!current) {
        this.log(`→ creating storage bucket ${bucket.name}`);
        if (this.options.dryRun) continue;
        await this.request("/storage/buckets", {
          method: "POST",
          body: JSON.stringify({
            name: bucket.name,
            public: bucket.public ?? false,
            file_size_limit: bucket.fileSizeLimit ?? null,
            allowed_mime_types: bucket.allowedMimeTypes ?? null,
            avif_autodetection: bucket.avifAutodetection ?? undefined,
          }),
        });
        continue;
      }

      const updates: Record<string, unknown> = {};
      if (
        typeof bucket.public === "boolean" &&
        bucket.public !== Boolean(current.public)
      ) {
        updates.public = bucket.public;
      }

      if (bucket.fileSizeLimit !== undefined) {
        const currentLimit = typeof current.file_size_limit === "number"
          ? current.file_size_limit
          : typeof current.fileSizeLimit === "number"
          ? current.fileSizeLimit
          : undefined;
        if (bucket.fileSizeLimit !== currentLimit) {
          updates.file_size_limit = bucket.fileSizeLimit;
        }
      }

      if (bucket.allowedMimeTypes) {
        const currentAllowed = Array.isArray(current.allowed_mime_types)
          ? current.allowed_mime_types
          : Array.isArray(current.allowedMimeTypes)
          ? current.allowedMimeTypes
          : undefined;
        if (!arrayEquals(currentAllowed, bucket.allowedMimeTypes)) {
          updates.allowed_mime_types = bucket.allowedMimeTypes;
        }
      }

      if (typeof bucket.avifAutodetection === "boolean") {
        const currentAvif = typeof current.avif_autodetection === "boolean"
          ? current.avif_autodetection
          : typeof current.avifAutodetect === "boolean"
          ? current.avifAutodetect
          : undefined;
        if (bucket.avifAutodetection !== currentAvif) {
          updates.avif_autodetection = bucket.avifAutodetection;
        }
      }

      if (Object.keys(updates).length > 0) {
        this.log(`→ updating storage bucket ${bucket.name}`);
        if (this.options.dryRun) continue;
        await this.request(`/storage/buckets/${bucket.name}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
      }
    }
  }

  private async ensureStoragePolicies(
    policies: StoragePolicyDefinition[],
  ): Promise<void> {
    for (const policy of policies) {
      const statements = this.buildStoragePolicyStatements(policy);
      for (const statement of statements) {
        await this.runSql(statement, `storage:policy:${policy.name}`);
      }
    }
  }

  private buildTableStatements(table: TableDefinition): string[] {
    const statements: string[] = [];
    const schema = table.schema ?? "public";
    const qualified = qualifyName(schema, table.name);

    if (schema) {
      statements.push(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)};`);
    }

    const columnSql = table.columns.map((column) =>
      this.columnDefinitionToSql(schema, column)
    );

    const constraintSql: string[] = [];
    if (table.primaryKey?.columns?.length) {
      const pkName = table.primaryKey.name ?? `${table.name}_pkey`;
      const cols = table.primaryKey.columns.map(quoteIdent).join(", ");
      constraintSql.push(
        `CONSTRAINT ${quoteIdent(pkName)} PRIMARY KEY (${cols})`,
      );
    }

    for (const check of table.checks ?? []) {
      constraintSql.push(
        `CONSTRAINT ${quoteIdent(check.name)} CHECK (${check.expression})`,
      );
    }

    const tableDef = [...columnSql, ...constraintSql].join(",\n  ");
    statements.push(
      `CREATE TABLE IF NOT EXISTS ${qualified} (\n  ${tableDef}\n);`,
    );

    if (table.comment) {
      statements.push(
        `COMMENT ON TABLE ${qualified} IS ${quoteLiteral(table.comment)};`,
      );
    }

    for (const column of table.columns) {
      if (column.comment) {
        statements.push(
          `COMMENT ON COLUMN ${qualified}.${quoteIdent(column.name)} IS ${
            quoteLiteral(column.comment)
          };`,
        );
      }
    }

    for (const index of table.indexes ?? []) {
      statements.push(this.indexDefinitionToSql(schema, table.name, index));
    }

    if (table.rowLevelSecurity) {
      statements.push(
        `ALTER TABLE ${qualified} ${
          table.rowLevelSecurity.enable ? "ENABLE" : "DISABLE"
        } ROW LEVEL SECURITY;`,
      );
      if (typeof table.rowLevelSecurity.force === "boolean") {
        statements.push(
          `ALTER TABLE ${qualified} ${
            table.rowLevelSecurity.force ? "FORCE" : "NO FORCE"
          } ROW LEVEL SECURITY;`,
        );
      }
    }

    for (const policy of table.policies ?? []) {
      const policyStatements = this.buildTablePolicyStatements(
        schema,
        table.name,
        policy,
      );
      statements.push(...policyStatements);
    }

    for (const extra of table.postDeploymentSql ?? []) {
      statements.push(extra);
    }

    return statements;
  }

  private columnDefinitionToSql(
    schema: string,
    column: ColumnDefinition,
  ): string {
    const parts: string[] = [quoteIdent(column.name), column.type];

    if (column.generatedExpression) {
      parts.push(`GENERATED ALWAYS AS (${column.generatedExpression}) STORED`);
    } else if (column.identity) {
      parts.push(`GENERATED ${column.identity.toUpperCase()} AS IDENTITY`);
    } else if (column.default) {
      parts.push(`DEFAULT ${column.default}`);
    }

    if (column.unique) {
      parts.push("UNIQUE");
    }

    if (column.check) {
      parts.push(`CHECK (${column.check})`);
    }

    if (column.references) {
      const targetSchema = column.references.schema ?? schema;
      const target = `${qualifyName(targetSchema, column.references.table)}(${
        quoteIdent(column.references.column)
      })`;
      parts.push(`REFERENCES ${target}`);
      if (column.references.onDelete) {
        parts.push(`ON DELETE ${column.references.onDelete}`);
      }
      if (column.references.onUpdate) {
        parts.push(`ON UPDATE ${column.references.onUpdate}`);
      }
    }

    if (column.nullable === false) {
      parts.push("NOT NULL");
    }

    return parts.join(" ");
  }

  private indexDefinitionToSql(
    schema: string,
    table: string,
    index: NonNullable<TableDefinition["indexes"]>[number],
  ): string {
    const qualified = qualifyName(schema, table);
    const concurrent = index.concurrently ? "CONCURRENTLY " : "";
    const unique = index.unique ? "UNIQUE " : "";
    const method = index.method ? ` USING ${index.method}` : "";
    const predicate = index.predicate ? ` WHERE ${index.predicate}` : "";
    const expression = index.expression.trim().startsWith("(")
      ? index.expression
      : `(${index.expression})`;
    return `CREATE ${unique}INDEX ${concurrent}IF NOT EXISTS ${
      quoteIdent(index.name)
    } ON ${qualified}${method} ${expression}${predicate};`;
  }

  private buildTablePolicyStatements(
    schema: string,
    table: string,
    policy: PolicyDefinition,
  ): string[] {
    const qualified = qualifyName(schema, table);
    const command = policy.command ?? "ALL";
    const roles = formatRoles(policy.roles);
    const usingClause = policy.using ? ` USING (${policy.using})` : "";
    const withCheckClause = policy.withCheck
      ? ` WITH CHECK (${policy.withCheck})`
      : "";

    const statements = [
      `DROP POLICY IF EXISTS ${quoteIdent(policy.name)} ON ${qualified};`,
      `CREATE POLICY ${
        quoteIdent(policy.name)
      } ON ${qualified} FOR ${command} TO ${roles}${usingClause}${withCheckClause};`,
    ];

    if (policy.comment) {
      statements.push(
        `COMMENT ON POLICY ${quoteIdent(policy.name)} ON ${qualified} IS ${
          quoteLiteral(policy.comment)
        };`,
      );
    }

    return statements;
  }

  private buildStoragePolicyStatements(
    policy: StoragePolicyDefinition,
  ): string[] {
    const bucketLiteral = quoteLiteral(policy.bucket);
    const baseCondition =
      `bucket_id = (SELECT id FROM storage.buckets WHERE name = ${bucketLiteral})`;
    const command = policy.command ?? "ALL";
    const roles = formatRoles(policy.roles);
    const usingCondition = policy.using
      ? `${baseCondition} AND (${policy.using})`
      : baseCondition;
    const withCheckCondition = policy.withCheck
      ? `${baseCondition} AND (${policy.withCheck})`
      : baseCondition;

    const allowsWithCheck = command === "INSERT" || command === "UPDATE" ||
      command === "ALL";

    const statements = [
      `DROP POLICY IF EXISTS ${quoteIdent(policy.name)} ON storage.objects;`,
      `CREATE POLICY ${
        quoteIdent(policy.name)
      } ON storage.objects FOR ${command} TO ${roles} USING (${usingCondition})${
        allowsWithCheck ? ` WITH CHECK (${withCheckCondition})` : ""
      };`,
    ];

    if (policy.comment) {
      statements.push(
        `COMMENT ON POLICY ${quoteIdent(policy.name)} ON storage.objects IS ${
          quoteLiteral(policy.comment)
        };`,
      );
    }

    return statements;
  }

  private async runSql(statement: string, context: string): Promise<void> {
    const trimmed = statement.trim();
    if (!trimmed) return;
    const finalStatement = trimmed.endsWith(";") ? trimmed : `${trimmed};`;
    if (this.options.verbose !== false) {
      console.log(`\n-- ${context}\n${finalStatement}`);
    }
    if (this.options.dryRun) return;
    await this.request("/database/queries", {
      method: "POST",
      body: JSON.stringify({ query: finalStatement }),
    });
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const url = `${this.apiBase}${path}`;
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", `Bearer ${this.accessToken}`);
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Supabase API request failed (${response.status} ${response.statusText}): ${text}`,
      );
    }

    if (response.status === 204) {
      return undefined;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }

    return await response.text();
  }

  private log(message: string): void {
    if (this.options.verbose !== false) {
      console.log(message);
    }
  }
}

function formatRoles(roles?: string[]): string {
  if (!roles || roles.length === 0) {
    return "PUBLIC";
  }
  return roles
    .map((role) =>
      role.toUpperCase() === "PUBLIC" ? "PUBLIC" : quoteIdent(role)
    )
    .join(", ");
}

function qualifyName(schema: string | undefined, name: string): string {
  if (!schema) {
    return quoteIdent(name);
  }
  return `${quoteIdent(schema)}.${quoteIdent(name)}`;
}

function quoteIdent(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function arrayEquals(a?: unknown[], b?: unknown[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const left = [...a].map(String).sort();
  const right = [...b].map(String).sort();
  return left.every((value, index) => value === right[index]);
}

interface ParsedArgs {
  planPath: string;
  projectRef?: string;
  accessToken?: string;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(args: string[]): ParsedArgs {
  const entries = new Map<string, string | boolean>();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.includes("=")
        ? [arg.slice(2, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
        : [arg.slice(2), undefined];
      if (value !== undefined) {
        entries.set(key, value);
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("-")) {
          entries.set(key, next);
          i++;
        } else {
          entries.set(key, true);
        }
      }
    }
  }

  const planArg = entries.get("plan") ?? "supabase/resource-plan.ts";
  const dryRun = parseBoolean(entries.get("dry-run") ?? entries.get("dryRun"));
  const verbose = !parseBoolean(entries.get("quiet"));

  return {
    planPath: typeof planArg === "string" ? planArg : String(planArg),
    projectRef: typeof entries.get("project") === "string"
      ? String(entries.get("project"))
      : undefined,
    accessToken: typeof entries.get("token") === "string"
      ? String(entries.get("token"))
      : undefined,
    dryRun,
    verbose,
  };
}

function parseBoolean(value: string | boolean | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "boolean") return value;
  const normalized = value.toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

if (import.meta.main) {
  const args = parseArgs(Deno.args);

  const planPath = isAbsolute(args.planPath)
    ? args.planPath
    : resolvePath(Deno.cwd(), args.planPath);
  const planUrl = toFileUrl(planPath).href;
  const planModule = await import(planUrl);
  const plan: ResourcePlan | undefined = planModule.resourcePlan ??
    planModule.default;
  if (!plan) {
    throw new Error(`No ResourcePlan exported from ${planPath}`);
  }

  const projectRef = args.projectRef ??
    Deno.env.get("SUPABASE_PROJECT_ID") ??
    Deno.env.get("SUPABASE_PROJECT_REF");
  if (!projectRef) {
    throw new Error(
      "Set SUPABASE_PROJECT_ID or SUPABASE_PROJECT_REF to continue.",
    );
  }

  const accessToken = args.accessToken ?? Deno.env.get("SUPABASE_ACCESS_TOKEN");
  if (!accessToken) {
    throw new Error(
      "Set SUPABASE_ACCESS_TOKEN to an access token with project write access.",
    );
  }

  const manager = new SupabaseResourceManager(projectRef, accessToken, {
    dryRun: args.dryRun,
    verbose: args.verbose,
  });

  await manager.apply(plan);

  if (args.verbose) {
    console.log("✓ Supabase resource plan applied");
  }
}
