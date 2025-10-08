import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

async function fetchJson(url, key) {
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`);
  }
  return response.json();
}

export async function fetchSupabaseMetadata({
  supabaseUrl = process.env.A_SUPABASE_URL,
  supabaseKey = process.env.A_SUPABASE_KEY,
  outputDir = path.join(process.cwd(), ".audit"),
} = {}) {
  if (!supabaseUrl || !supabaseKey) {
    const meta = {
      ok: false,
      error: "Missing A_SUPABASE_URL/A_SUPABASE_KEY",
    };
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(outputDir, "meta.json"),
      JSON.stringify(meta, null, 2),
    );
    return meta;
  }

  const base = supabaseUrl.replace(/\/$/, "");

  const result = { ok: true, tables: [], indexes: [] };

  try {
    const tables = await fetchJson(
      `${base}/rest/v1/pg_meta.tables?select=schema,name`,
      supabaseKey,
    );
    result.tables = tables
      .filter((table) => table.schema === "public")
      .map((table) => table.name)
      .sort();
  } catch (error) {
    console.warn("Failed to fetch pg_meta tables metadata", error);
  }

  try {
    const indexes = await fetchJson(
      `${base}/rest/v1/pg_meta.indexes?select=schema,table,name,is_unique,is_primary,columns`,
      supabaseKey,
    );
    result.indexes = indexes
      .filter((index) => index.schema === "public")
      .map((index) => ({
        table: index.table,
        name: index.name,
        is_unique: Boolean(index.is_unique),
        is_primary: Boolean(index.is_primary),
        columns: index.columns,
      }));
  } catch (error) {
    console.warn("Failed to fetch pg_meta indexes metadata", error);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "meta.json"),
    JSON.stringify(result, null, 2),
  );

  return result;
}

if (
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
) {
  fetchSupabaseMetadata().then((meta) => {
    console.log(`metadata ok=${meta.ok}`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
