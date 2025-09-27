#!/usr/bin/env -S deno run -A
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.224.0/fs/exists.ts";
import { join, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { fromFileUrl } from "https://deno.land/std@0.224.0/path/from_file_url.ts";

const REPOSITORY = "https://github.com/ggml-org/llama.cpp.git";
const COMMIT = "72b24d96c6888c609d562779a23787304ae4609c";
const PRUNE_PATHS = [
  ".ci",
  ".devops",
  ".github",
  "android",
  "bindings",
  "docs",
  "examples/assets",
  "examples/beat",
  "examples/bench",
  "examples/benchmark",
  "examples/benchm",
  "examples/chat",
  "examples/convert-llama-ggml-to-gguf",
  "examples/gguf-split",
  "examples/lora",
  "examples/metal",
  "examples/quantize",
  "examples/simple",
  "examples/speculative",
  "examples/supervised",
  "examples/train-text-from-scratch",
  "examples/unicode",
  "examples/vdot",
  "examples/whisper",
  "examples/whisper-wip",
  "models",
  "python",
  "scripts",
  "tests",
];
const KEEP_EXAMPLES = new Set(["server"]);

const args = new Set(Deno.args);
const force = args.has("--force") || args.has("-f");
const noPrune = args.has("--no-prune");

if (args.has("--help")) {
  printHelp();
  Deno.exit(0);
}

const repoRoot = resolve(fromFileUrl(new URL("../", import.meta.url)));
const baseDir = join(repoRoot, "third_party", "llama.cpp");
const vendorDir = join(baseDir, "vendor");

await ensureDir(baseDir);

if (await exists(vendorDir)) {
  if (!force) {
    console.error(
      `vendor directory already exists at ${vendorDir}. Rerun with --force to replace it.`,
    );
    Deno.exit(1);
  }
  console.log(`Removing existing vendor directory at ${vendorDir}`);
  await Deno.remove(vendorDir, { recursive: true });
}

await assertGitAvailable();

const tmpDir = await Deno.makeTempDir({ prefix: "llama.cpp-sync-" });
console.log(`Cloning ${REPOSITORY} into ${tmpDir}`);
await runCommand("git", [
  "clone",
  "--filter=blob:none",
  "--no-checkout",
  REPOSITORY,
  tmpDir,
]);

await runCommand("git", [
  "fetch",
  "--depth=1",
  "origin",
  COMMIT,
], tmpDir);
await runCommand("git", ["checkout", COMMIT], tmpDir);

const commitDate = (await runCapture("git", [
  "show",
  "-s",
  "--format=%cI",
  COMMIT,
], tmpDir)).trim();

if (!noPrune) {
  console.log("Pruning unused directories");
  for (const path of PRUNE_PATHS) {
    const target = join(tmpDir, path);
    if (await exists(target)) {
      await Deno.remove(target, { recursive: true });
    }
  }

  const examplesDir = join(tmpDir, "examples");
  if (await exists(examplesDir)) {
    for await (const entry of Deno.readDir(examplesDir)) {
      if (entry.isDirectory && !KEEP_EXAMPLES.has(entry.name)) {
        await Deno.remove(join(examplesDir, entry.name), { recursive: true });
      }
    }
  }
}

await Deno.remove(join(tmpDir, ".git"), { recursive: true });
await ensureDir(baseDir);
await Deno.rename(tmpDir, vendorDir);

await writeMetadata(baseDir, {
  repository: REPOSITORY,
  commit: COMMIT,
  commitDate,
  pruneDisabled: noPrune,
});

console.log("llama.cpp synced successfully.");

function printHelp() {
  console.log(`Sync llama.cpp into third_party/llama.cpp/vendor

Usage:
  deno run -A scripts/sync-llama-cpp.ts [options]

Options:
  --force, -f     Replace any existing vendor directory
  --no-prune      Keep the full upstream tree without pruning
  --help          Show this message
`);
}

async function assertGitAvailable() {
  try {
    await runCommand("git", ["--version"]);
  } catch (_error) {
    console.error(
      "git is required to sync llama.cpp but was not found in PATH.",
    );
    Deno.exit(1);
  }
}

async function runCommand(
  command: string,
  args: string[],
  cwd?: string,
) {
  const process = new Deno.Command(command, {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await process.output();
  if (code !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

async function runCapture(
  command: string,
  args: string[],
  cwd?: string,
): Promise<string> {
  const process = new Deno.Command(command, {
    args,
    cwd,
    stdout: "piped",
    stderr: "inherit",
  });
  const { code, stdout } = await process.output();
  if (code !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
  return new TextDecoder().decode(stdout);
}

async function writeMetadata(
  base: string,
  metadata: {
    repository: string;
    commit: string;
    commitDate: string;
    pruneDisabled: boolean;
  },
) {
  const metadataPath = join(base, "version.json");
  const content = JSON.stringify(
    {
      ...metadata,
      notes: "Managed via scripts/sync-llama-cpp.ts",
    },
    null,
    2,
  ) + "\n";
  await Deno.writeTextFile(metadataPath, content);
}
