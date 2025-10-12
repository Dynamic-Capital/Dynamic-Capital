import { compileFunc } from "@ton-community/func-js";
import { spawn, type SpawnOptions } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep as pathSeparator } from "node:path";
import { fileURLToPath } from "node:url";
import { createFuncSourceResolver } from "../../dynamic-capital-ton/contracts/func-source-resolver.js";

type CliFlags = {
  readonly outDir?: string;
  readonly skipTact: boolean;
  readonly skipFunc: boolean;
  readonly clean: boolean;
  readonly verbose: boolean;
  readonly unknown: string[];
};

type BuildSummary = {
  readonly tactArtifacts: string[];
  readonly funcArtifacts: string[];
};

type TactProjectConfig = {
  readonly name: string;
  readonly path: string;
};

const TACT_ENTRYPOINTS: readonly TactProjectConfig[] = [
  { name: "dao-dns-controller", path: "dao_dns_controller.tact" },
  { name: "dao-dns-controller-lite", path: "tact/DaoDnsController.tact" },
  { name: "pool-allocator", path: "pool_allocator.tact" },
  { name: "jetton-master", path: "jetton/master.tact" },
  { name: "jetton-wallet", path: "jetton/wallet.tact" },
  { name: "theme-collection", path: "theme/theme_collection.tact" },
  { name: "theme-item", path: "theme/theme_item.tact" },
];

const FUNC_TARGETS: readonly string[] = ["jetton/discoverable/master.fc"];

const DEFAULT_OUT_DIR = "dynamic-capital-ton/contracts/build";
const TACT_SUBDIR = "tact";
const FUNC_SUBDIR = "func";

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    outDir: undefined,
    skipTact: false,
    skipFunc: false,
    clean: false,
    verbose: false,
    unknown: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      continue;
    }

    if (arg === "--out") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value for --out");
      }
      flags.outDir = value;
      i += 1;
      continue;
    }

    if (arg === "--skip-tact") {
      flags.skipTact = true;
      continue;
    }

    if (arg === "--skip-func") {
      flags.skipFunc = true;
      continue;
    }

    if (arg === "--clean") {
      flags.clean = true;
      continue;
    }

    if (arg === "--verbose") {
      flags.verbose = true;
      continue;
    }

    flags.unknown.push(arg);
  }

  return flags;
}

function toProjectPath(value: string): string {
  return value.split(pathSeparator).join("/");
}

async function compileTactContracts(
  contractsRoot: string,
  outRoot: string,
  tactOutDir: string,
  verbose: boolean,
): Promise<string[]> {
  const outputRelative = toProjectPath(relative(contractsRoot, tactOutDir) || ".");
  const tempDir = join(outRoot, ".tact-temp");
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const tactProjects: Array<{
    name: string;
    path: string;
    output: string;
  }> = [];

  for (const project of TACT_ENTRYPOINTS) {
    const originalPath = resolve(contractsRoot, project.path);
    if (!existsSync(originalPath)) {
      throw new Error(`Tact source not found: ${originalPath}`);
    }

    const rawSource = readFileSync(originalPath, "utf8");
    const patchedSource = rawSource;
    const tempPath = join(tempDir, `${project.name}.tact`);
    await writeFile(tempPath, patchedSource);

    tactProjects.push({
      name: project.name,
      path: toProjectPath(relative(contractsRoot, tempPath)),
      output: outputRelative,
    });
  }

  const tactConfig = { projects: tactProjects };
  const configPath = join(contractsRoot, "tact.build.config.json");

  if (verbose) {
    console.log(`[tact] project root: ${contractsRoot}`);
    console.log(`[tact] config path: ${configPath}`);
    console.log(`[tact] config: ${JSON.stringify(tactProjects, null, 2)}`);
  }

  await writeFile(configPath, JSON.stringify(tactConfig, null, 2));

  const args = ["tact"];
  if (!verbose) {
    args.push("--quiet");
  }
  args.push("--config", configPath);

  try {
    await runCommand("npx", args, { cwd: contractsRoot, env: process.env });
  } finally {
    await rm(configPath, { force: true });
    await rm(tempDir, { recursive: true, force: true });
  }

  const generatedFiles = await listArtifacts(tactOutDir, [".code.boc", ".code.fc", ".ts"]);
  return generatedFiles;
}

async function compileFuncTargets(
  contractsRoot: string,
  funcOutDir: string,
  verbose: boolean,
): Promise<string[]> {
  const loadSource = createFuncSourceResolver(contractsRoot);
  const artifacts: string[] = [];

  for (const target of FUNC_TARGETS) {
    if (verbose) {
      console.log(`[func] compiling ${target}`);
    }

    const compileResult = await compileFunc({
      targets: [target],
      sources: loadSource,
    });

    if (compileResult.status === "error") {
      throw new Error(`FunC compilation failed for ${target}: ${compileResult.message}`);
    }

    const basename = target.split("/").pop()?.replace(/\.fc$/, "") ?? target.replace(/[^a-z0-9_-]/gi, "-");
    const codePath = join(funcOutDir, `${basename}.code.boc`);
    const fiftPath = join(funcOutDir, `${basename}.code.fif`);

    await writeFile(codePath, Buffer.from(compileResult.codeBoc, "base64"));
    await writeFile(fiftPath, compileResult.fiftCode, "utf8");

    const warnings = compileResult.warnings?.trim();
    if (warnings && warnings.length > 0) {
      console.warn(`[func] warnings for ${target}:\n${warnings}`);
    }

    artifacts.push(codePath, fiftPath);
  }

  return artifacts;
}

async function listArtifacts(rootDir: string, extensions: readonly string[]): Promise<string[]> {
  if (!existsSync(rootDir)) {
    return [];
  }

  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(join(rootDir, entry.name));
    }
  }

  return files.sort();
}

async function runCommand(command: string, args: string[], options: SpawnOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function maybeClean(path: string, enabled: boolean): Promise<void> {
  if (!enabled) {
    return;
  }

  await rm(path, { recursive: true, force: true });
}

async function main(): Promise<BuildSummary> {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.unknown.length > 0) {
    console.warn(`Ignoring unknown arguments: ${flags.unknown.join(", ")}`);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const repoRoot = resolve(__dirname, "../..");
  const contractsRoot = resolve(repoRoot, "dynamic-capital-ton/contracts");
  const outRoot = resolve(repoRoot, flags.outDir ?? DEFAULT_OUT_DIR);
  const tactOutDir = resolve(outRoot, TACT_SUBDIR);
  const funcOutDir = resolve(outRoot, FUNC_SUBDIR);
  const nodeMajorVersion = Number(process.versions.node.split(".")[0] ?? "0");
  const tactSupported = nodeMajorVersion >= 22;
  const skipTact = flags.skipTact || !tactSupported;

  if (!tactSupported && !flags.skipTact) {
    console.warn(
      `⚠️  Detected Node.js ${process.versions.node}. Tact CLI requires Node.js 22 or newer, skipping Tact compilation.`,
    );
  }

  if (!skipTact) {
    await maybeClean(tactOutDir, flags.clean);
    await ensureDir(tactOutDir);
  }

  if (!flags.skipFunc) {
    await maybeClean(funcOutDir, flags.clean);
    await ensureDir(funcOutDir);
  }

  const summary: BuildSummary = { tactArtifacts: [], funcArtifacts: [] };

  if (!skipTact) {
    console.log("🛠️  Building Tact contracts...");
    summary.tactArtifacts = await compileTactContracts(contractsRoot, outRoot, tactOutDir, flags.verbose);
    console.log(`✅ Tact build completed (${summary.tactArtifacts.length} artifacts)`);
  } else {
    console.log("⏭️  Skipping Tact compilation");
  }

  if (!flags.skipFunc) {
    console.log("🛠️  Building FunC targets...");
    summary.funcArtifacts = await compileFuncTargets(contractsRoot, funcOutDir, flags.verbose);
    console.log(`✅ FunC build completed (${summary.funcArtifacts.length} artifacts)`);
  } else {
    console.log("⏭️  Skipping FunC compilation");
  }

  return summary;
}

main()
  .then((summary) => {
    if (summary.tactArtifacts.length > 0) {
      console.log("📦 Tact artifacts:");
      for (const artifact of summary.tactArtifacts) {
        console.log(` • ${artifact}`);
      }
    }

    if (summary.funcArtifacts.length > 0) {
      console.log("📦 FunC artifacts:");
      for (const artifact of summary.funcArtifacts) {
        console.log(` • ${artifact}`);
      }
    }
  })
  .catch((error) => {
    console.error("❌ Contract build failed:", error);
    process.exitCode = 1;
  });
