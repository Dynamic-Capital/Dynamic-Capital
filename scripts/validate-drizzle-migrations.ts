#!/usr/bin/env -S deno run --allow-read
import { extname, join } from "https://deno.land/std@0.224.0/path/mod.ts";

const MIGRATIONS_DIR = "supabase/migrations";

async function main() {
  let stat: Deno.FileInfo;
  try {
    stat = await Deno.stat(MIGRATIONS_DIR);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`❌ Missing migrations directory at "${MIGRATIONS_DIR}".`);
      Deno.exit(1);
    }
    throw error;
  }

  if (!stat.isDirectory) {
    console.error(`❌ Expected "${MIGRATIONS_DIR}" to be a directory.`);
    Deno.exit(1);
  }

  const entries: string[] = [];
  for await (const entry of Deno.readDir(MIGRATIONS_DIR)) {
    if (!entry.isFile) continue;
    if (extname(entry.name) !== ".sql") continue;
    entries.push(entry.name);
  }

  if (entries.length === 0) {
    console.error("❌ No SQL migration files were found.");
    Deno.exit(1);
  }

  entries.sort();

  const namePattern = /^[0-9x_]{8,17}_[a-z0-9_-]+\.sql$/;

  for (const name of entries) {
    if (!namePattern.test(name)) {
      console.error(
        `❌ Migration "${name}" must follow the pattern YYYYMMDDHHMMSS_description.sql using lowercase kebab-case.`,
      );
      Deno.exit(1);
    }

    const filePath = join(MIGRATIONS_DIR, name);
    const contents = await Deno.readTextFile(filePath);
    if (contents.trim().length === 0) {
      console.error(`❌ Migration file "${name}" is empty.`);
      Deno.exit(1);
    }

    const normalized = contents.replace(/\r\n/g, "\n");
    if (!normalized.endsWith("\n")) {
      console.error(
        `❌ Migration file "${name}" must end with a trailing newline.`,
      );
      Deno.exit(1);
    }
  }

  console.log(
    `✅ Validated ${entries.length} Supabase migrations in ${MIGRATIONS_DIR}.`,
  );
}

if (import.meta.main) {
  await main();
}
