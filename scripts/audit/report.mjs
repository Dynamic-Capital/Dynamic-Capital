import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function table(rows, headers) {
  const headerRow = `| ${headers.join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => ":--").join(" | ")} |`;
  const bodyRows = rows
    .map((row) =>
      `| ${headers.map((key) => String(row[key] ?? "")).join(" | ")} |`
    )
    .join("\n");
  return [headerRow, separatorRow, bodyRows].filter(Boolean).join("\n");
}

export function buildReport({
  outputDir = path.join(process.cwd(), ".audit"),
  codeScan,
  supabaseMeta,
} = {}) {
  const code = codeScan ?? loadJson(path.join(outputDir, "code_scan.json")) ?? {
    edge_functions: { present: [], referenced: [] },
    callbacks: { defined: [], used_anywhere: [] },
    tables: { referenced: [] },
    scanned_files: 0,
  };
  const meta = supabaseMeta ?? loadJson(path.join(outputDir, "meta.json")) ?? {
    ok: false,
    tables: [],
    indexes: [],
  };

  const presentFns = new Set(code.edge_functions.present ?? []);
  const refFns = new Set(code.edge_functions.referenced ?? []);
  const unusedFns = [...presentFns].filter((fn) => !refFns.has(fn)).sort();

  const cbDefined = new Set(code.callbacks.defined ?? []);
  const cbUsed = new Set(code.callbacks.used_anywhere ?? []);
  const unusedCallbacks = [...cbDefined].filter((cb) => !cbUsed.has(cb)).sort();

  const codeTables = new Set(code.tables.referenced ?? []);
  const dbTables = new Set(meta.tables ?? []);
  const dbOnlyTables = [...dbTables].filter((table) => !codeTables.has(table))
    .sort();
  const codeOnlyTables = [...codeTables].filter((table) => !dbTables.has(table))
    .sort();

  const indexes = Array.isArray(meta.indexes) ? meta.indexes : [];
  const suspectIndexes = indexes
    .filter((index) => !codeTables.has(index.table))
    .filter((index) => !index.is_primary)
    .map((index) => ({
      table: index.table,
      name: index.name,
      columns: index.columns,
      is_unique: Boolean(index.is_unique),
    }))
    .sort((a, b) => (a.table + a.name).localeCompare(b.table + b.name));

  const report = {
    summary: {
      files_scanned: code.scanned_files ?? 0,
      edge_functions: {
        total: presentFns.size,
        referenced: refFns.size,
        unused: unusedFns.length,
      },
      callbacks: {
        defined: cbDefined.size,
        used: cbUsed.size,
        unused: unusedCallbacks.length,
      },
      tables: {
        referenced_in_code: codeTables.size,
        in_db: dbTables.size,
        db_only: dbOnlyTables.length,
        code_only: codeOnlyTables.length,
      },
      suspect_indexes: suspectIndexes.length,
    },
    details: {
      unused_edge_functions: unusedFns,
      unused_callbacks: unusedCallbacks,
      db_only_tables: dbOnlyTables,
      code_only_tables: codeOnlyTables,
      suspect_indexes: suspectIndexes,
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "audit_report.json"),
    JSON.stringify(report, null, 2),
  );

  const markdown = `# Project Audit Report

## Summary
- Files scanned: ${report.summary.files_scanned}
- Edge Functions: total ${report.summary.edge_functions.total}, referenced ${report.summary.edge_functions.referenced}, unused ${report.summary.edge_functions.unused}
- Callbacks: defined ${report.summary.callbacks.defined}, used ${report.summary.callbacks.used}, unused ${report.summary.callbacks.unused}
- Tables: referenced in code ${report.summary.tables.referenced_in_code}, in DB ${report.summary.tables.in_db}, DB-only ${report.summary.tables.db_only}, code-only ${report.summary.tables.code_only}
- Suspect indexes: ${report.summary.suspect_indexes}

## Unused Edge Functions
${
    report.details.unused_edge_functions.length
      ? report.details.unused_edge_functions.map((fn) => `- ${fn}`).join("\n")
      : "_None_"
  }

## Unused Callback Keys
${
    report.details.unused_callbacks.length
      ? report.details.unused_callbacks.map((cb) => `- ${cb}`).join("\n")
      : "_None_"
  }

## Tables present in DB but never referenced in code
${
    report.details.db_only_tables.length
      ? report.details.db_only_tables.map((table) => `- ${table}`).join("\n")
      : "_None_"
  }

## Tables referenced in code but not found in DB
${
    report.details.code_only_tables.length
      ? report.details.code_only_tables.map((table) => `- ${table}`).join("\n")
      : "_None_"
  }

## Suspect Indexes
${
    report.details.suspect_indexes.length
      ? table(report.details.suspect_indexes, [
        "table",
        "name",
        "columns",
        "is_unique",
      ])
      : "_None_"
  }
`;

  fs.writeFileSync(path.join(outputDir, "audit_report.md"), markdown);

  return report;
}

if (
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const code = loadJson(path.join(process.cwd(), ".audit", "code_scan.json"));
  const meta = loadJson(path.join(process.cwd(), ".audit", "meta.json"));
  buildReport({ codeScan: code ?? undefined, supabaseMeta: meta ?? undefined });
}
