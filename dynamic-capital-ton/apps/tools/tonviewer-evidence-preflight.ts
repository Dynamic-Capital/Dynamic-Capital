import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

import { computeSha256Hex, resolveProjectRoot } from "./_shared.ts";

interface CliOptions {
  metadata?: string;
  expect?: string;
  "write-note"?: string;
  log?: string;
  quiet?: boolean;
}

function formatDigestLine(metadataPath: string, digest: string): string {
  return `SHA-256 (${metadataPath}) = ${digest}`;
}

async function writeDigestNote(
  path: string,
  metadataPath: string,
  digest: string,
) {
  await ensureDir(dirname(path));
  const now = new Date().toISOString();
  const contents = `${
    formatDigestLine(metadataPath, digest)
  }\nGenerated: ${now}\n`;
  await Deno.writeTextFile(path, contents);
}

const textDecoder = new TextDecoder();

interface StatusLogResult {
  exitCode: number;
  warning: string | null;
}

async function runStatusLog(path: string): Promise<StatusLogResult> {
  await ensureDir(dirname(path));

  const statusScript = fromFileUrl(
    new URL("./check-tonviewer-status.ts", import.meta.url),
  );

  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", statusScript],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();
  await Deno.writeFile(path, stdout);

  const warning = textDecoder.decode(stderr).trim() || null;

  if (code !== 0 && code !== 3) {
    throw new Error(
      `check-tonviewer-status.ts exited with code ${code}: ${warning ?? ""}`
        .trim(),
    );
  }

  return { exitCode: code, warning };
}

async function main() {
  const parsed = parse(Deno.args) as CliOptions;
  const projectRoot = resolveProjectRoot(import.meta.url);

  const metadataPath = parsed.metadata
    ? parsed.metadata
    : join(projectRoot, "contracts", "jetton", "metadata.json");
  const expectedDigest = parsed.expect ??
    "1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4";

  const metadataBytes = await Deno.readFile(metadataPath);
  const digest = await computeSha256Hex(metadataBytes);
  const digestMatches = expectedDigest === "" || digest === expectedDigest;

  if (!digestMatches) {
    throw new Error(
      `Digest mismatch for ${metadataPath}. Expected ${expectedDigest}, received ${digest}.`,
    );
  }

  if (parsed["write-note"]) {
    await writeDigestNote(parsed["write-note"], metadataPath, digest);
  }

  let statusLogResult: StatusLogResult | null = null;
  if (parsed.log) {
    statusLogResult = await runStatusLog(parsed.log);
  }

  if (!parsed.quiet) {
    const results = {
      metadataPath,
      digest,
      expectedDigest,
      digestMatches,
      digestNote: parsed["write-note"] ?? null,
      statusLog: parsed.log ?? null,
      statusExitCode: statusLogResult?.exitCode ?? null,
      statusWarning: statusLogResult?.warning ?? null,
      generatedAt: new Date().toISOString(),
    };
    console.log(JSON.stringify(results, null, 2));
  }
}

if (import.meta.main) {
  await main();
}
