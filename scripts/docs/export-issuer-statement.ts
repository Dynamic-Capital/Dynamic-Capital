import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const SOURCE_RELATIVE = "docs/tonviewer/dct-issuer-statement.md";
const EXPORTS_RELATIVE = "exports";

interface CliOptions {
  date: string;
  force: boolean;
}

function parseOptions(): CliOptions {
  const args = process.argv.slice(2);
  let dateArg: string | undefined;
  let force = false;

  for (const arg of args) {
    if (arg === "--force") {
      force = true;
      continue;
    }

    if (dateArg) {
      console.error(
        "[export] Unexpected argument '%s'. Provide a single YYYYMMDD date and optional --force flag.",
        arg,
      );
      process.exit(1);
    }

    dateArg = arg;
  }

  const date = dateArg ??
    new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (!/^\d{8}$/.test(date)) {
    console.error(
      "[export] Invalid date '%s'. Expected format: YYYYMMDD.",
      date,
    );
    process.exit(1);
  }

  return { date, force };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureSourceExists(sourcePath: string) {
  if (await fileExists(sourcePath)) {
    return;
  }

  console.error(
    "[export] Source markdown not found at %s. Ensure repository docs are synced.",
    path.relative(repoRoot, sourcePath),
  );
  process.exit(1);
}

async function runPandoc(sourcePath: string, outputPath: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pandoc", [sourcePath, "-o", outputPath], {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "pandoc executable not found. Install pandoc (https://pandoc.org) and ensure it is available on PATH.",
          ),
        );
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pandoc exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const { date, force } = parseOptions();
  const sourcePath = path.join(repoRoot, SOURCE_RELATIVE);
  const outputName = `dct-issuer-statement-${date}.pdf`;
  const outputPath = path.join(repoRoot, EXPORTS_RELATIVE, outputName);

  await ensureSourceExists(sourcePath);
  await mkdir(path.dirname(outputPath), { recursive: true });

  if (!force && await fileExists(outputPath)) {
    console.error(
      "[export] Output %s already exists. Use --force to overwrite.",
      path.relative(repoRoot, outputPath),
    );
    return;
  }

  console.log(
    "[export] Generating %s from %s",
    path.relative(repoRoot, outputPath),
    path.relative(repoRoot, sourcePath),
  );

  try {
    await runPandoc(sourcePath, outputPath);
  } catch (error) {
    console.error("[export] Failed: %s", (error as Error).message);
    process.exit(1);
  }

  console.log("[export] Wrote %s", path.relative(repoRoot, outputPath));
}

await main();
