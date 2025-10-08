import path from "path";
import { scanCode } from "./scan_code.mjs";
import { fetchSupabaseMetadata } from "./read_meta.mjs";
import { buildReport } from "./report.mjs";

function resolveOutputDir() {
  return path.join(process.cwd(), ".audit");
}

async function run() {
  const outputDir = resolveOutputDir();

  const supabaseUrl = process.env.A_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.A_SUPABASE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  const code = scanCode({ outputDir });
  const meta = await fetchSupabaseMetadata({
    outputDir,
    supabaseUrl,
    supabaseKey,
  });
  buildReport({ outputDir, codeScan: code, supabaseMeta: meta });

  console.log("[audit] report generated in", outputDir);
}

run().catch((error) => {
  console.error("[audit] failed", error);
  process.exit(1);
});
