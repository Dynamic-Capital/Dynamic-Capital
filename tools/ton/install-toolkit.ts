import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Step {
  readonly title: string;
  readonly command: string;
  readonly args: string[];
  readonly cwd?: string;
  readonly optional?: boolean;
}

interface ToolkitConfig {
  readonly python?: {
    readonly packages?: string[];
    readonly optionalGroups?: Record<string, string[]>;
  };
  readonly node?: {
    readonly packages?: string[];
    readonly installPlaywright?: boolean;
  };
  readonly containers?: {
    readonly composeFile?: string;
    readonly services?: string[];
  };
  readonly defaults?: {
    readonly extras?: string[];
  };
}

const defaultConfig: Required<ToolkitConfig> = {
  python: {
    packages: [
      "tonpy",
      "tonapi-sdk",
      "ccxt",
      "pandas",
      "numpy",
      "pandas-ta",
      "ta-lib",
      "tsfresh",
      "scikit-learn",
      "xgboost",
      "lightgbm",
      "catboost",
      "torch",
      "pytorch-lightning",
      "prophet",
      "statsmodels",
      "mlflow",
      "backtrader",
      "vectorbt",
      "pyportfolioopt",
    ],
    optionalGroups: {
      validation: ["great-expectations", "pandera"],
      rl: ["stable-baselines3", "finrl"],
      tracking: ["wandb", "tensorboard"],
    },
  },
  node: {
    packages: [
      "tonweb",
      "ton",
      "tonapi-sdk",
      "ccxt",
      "playwright",
      "@playwright/test",
    ],
    installPlaywright: true,
  },
  containers: {
    composeFile: "docker/ton-toolkit/docker-compose.yml",
    services: ["zookeeper", "kafka", "timescale", "redis"],
  },
  defaults: {
    extras: [],
  },
};

const rawArgs = process.argv.slice(2);
const applyChanges = rawArgs.includes("--apply");
const skipPython = rawArgs.includes("--skip-python");
const skipNode = rawArgs.includes("--skip-node");
const skipContainers = rawArgs.includes("--skip-containers");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const defaultConfigPath = join(__dirname, "toolkit.config.json");
const configPath = resolveConfigPath(rawArgs, defaultConfigPath, repoRoot);
const mergedConfig = await loadToolkitConfig(configPath);
const optionalPythonGroups = new Map<string, string[]>(
  Object.entries(mergedConfig.python?.optionalGroups ?? {}),
);
const extrasSelection = parseExtras(rawArgs, optionalPythonGroups);
const extras = extrasSelection.explicit && extrasSelection.values.size > 0
  ? extrasSelection.values
  : deriveDefaultExtras(
    mergedConfig.defaults?.extras ?? [],
    optionalPythonGroups,
  );

const toolkitRoot = join(repoRoot, ".ton-toolkit");
const pythonEnvDir = join(toolkitRoot, "python");
const nodeWorkspaceDir = join(toolkitRoot, "javascript");
const composePath = mergedConfig.containers?.composeFile ?? "";
const composeFile = isAbsolute(composePath)
  ? composePath
  : join(repoRoot, composePath);

await ensureDir(toolkitRoot);

const steps: Step[] = [];

const pythonCommand = skipPython ? null : await detectPython();
if (!skipPython) {
  if (!pythonCommand) {
    reportWarning(
      "Python executable not found. Install Python 3.9+ and rerun or pass --skip-python.",
    );
  } else {
    await ensureDir(toolkitRoot);
    const pythonExecutable = getVenvPythonExecutable(pythonEnvDir);
    const venvExists = await pathExists(pythonExecutable);
    const createArgs = venvExists
      ? ["-m", "venv", "--upgrade", pythonEnvDir]
      : ["-m", "venv", pythonEnvDir];
    steps.push({
      title: venvExists
        ? "Upgrade TON toolkit Python virtual environment"
        : "Create TON toolkit Python virtual environment",
      command: pythonCommand,
      args: createArgs,
    });
    const pythonBasePackages = mergedConfig.python?.packages ?? [];
    const pythonPackages = Array.from(
      new Set([
        ...pythonBasePackages,
        ...collectOptionalPackages(extras, optionalPythonGroups),
      ]),
    );
    if (pythonPackages.length > 0) {
      steps.push({
        title: "Install TON toolkit Python dependencies",
        command: pythonExecutable,
        args: ["-m", "pip", "install", "--upgrade", "pip", ...pythonPackages],
      });
    }
  }
}

const packageManager = skipNode ? null : await detectPackageManager();
if (!skipNode) {
  if (!packageManager) {
    reportWarning(
      "No supported JavaScript package manager found. Install pnpm or npm and rerun or pass --skip-node.",
    );
  } else {
    await ensureDir(nodeWorkspaceDir);
    await ensureNodePackageJson(nodeWorkspaceDir);
    const nodePackages = mergedConfig.node?.packages ?? [];
    const installArgs = packageManager === "pnpm"
      ? ["add", ...nodePackages]
      : ["install", ...nodePackages];
    const command = packageManager === "pnpm" ? "pnpm" : "npm";
    steps.push({
      title: "Install TON toolkit JavaScript dependencies",
      command,
      args: installArgs,
      cwd: nodeWorkspaceDir,
    });
    if (mergedConfig.node?.installPlaywright) {
      const playwrightStep = packageManager === "pnpm"
        ? {
          command: "pnpm",
          args: ["exec", "playwright", "install"],
          cwd: nodeWorkspaceDir,
        }
        : {
          command: "npx",
          args: ["playwright", "install"],
          cwd: nodeWorkspaceDir,
        };
      steps.push({
        title: "Install Playwright browser binaries",
        command: playwrightStep.command,
        args: playwrightStep.args,
        cwd: playwrightStep.cwd,
        optional: true,
      });
    }
  }
}

const dockerInvocation = skipContainers ? null : await detectDockerCompose();
if (!skipContainers) {
  if (!dockerInvocation) {
    reportWarning(
      "Docker Compose not available. Install Docker Desktop or docker-compose plugin and rerun or pass --skip-containers.",
    );
  } else {
    const services = mergedConfig.containers?.services ?? [];
    steps.push({
      title: "Start TON toolkit stateful services (Kafka, TimescaleDB, Redis)",
      command: dockerInvocation.command,
      args: [
        ...dockerInvocation.args,
        "-f",
        composeFile,
        "up",
        "-d",
        ...services,
      ],
      optional: true,
    });
  }
}

if (!applyChanges) {
  printPlan(steps, extras, {
    configPath,
    extrasExplicit: extrasSelection.explicit,
  });
  process.exit(0);
}

await runSteps(steps);

console.log("\n✅ TON toolkit installation complete.");

interface ExtrasResult {
  readonly values: Set<string>;
  readonly explicit: boolean;
}

function parseExtras(
  args: string[],
  optionalGroups: Map<string, string[]>,
): ExtrasResult {
  const values = new Set<string>();
  let explicit = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--extras") {
      explicit = true;
      const value = args[index + 1];
      if (value) {
        value.split(",").map((entry) => entry.trim().toLowerCase()).forEach(
          (entry) => values.add(entry),
        );
      }
      index += 1;
    } else if (arg.startsWith("--extras=")) {
      explicit = true;
      arg.slice("--extras=".length).split(",").map((entry) =>
        entry.trim().toLowerCase()
      ).forEach((entry) => values.add(entry));
    }
  }
  if (values.has("all")) {
    return {
      values: new Set(optionalGroups.keys()),
      explicit,
    };
  }
  return {
    values: new Set(
      [...values].filter((key) => optionalGroups.has(key)),
    ),
    explicit,
  };
}

function deriveDefaultExtras(
  defaults: readonly string[],
  optionalGroups: Map<string, string[]>,
): Set<string> {
  return new Set(
    defaults
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => optionalGroups.has(entry)),
  );
}

function collectOptionalPackages(
  groups: Set<string>,
  optionalGroups: Map<string, string[]>,
): string[] {
  const packages: string[] = [];
  for (const group of groups) {
    const entries = optionalGroups.get(group);
    if (entries) {
      packages.push(...entries);
    }
  }
  return packages;
}

async function loadToolkitConfig(
  configPath: string,
): Promise<Required<ToolkitConfig>> {
  const configExists = await pathExists(configPath);
  if (!configExists) {
    return defaultConfig;
  }
  try {
    const contents = await readFile(configPath, { encoding: "utf-8" });
    const parsed = JSON.parse(contents) as ToolkitConfig;
    return mergeToolkitConfig(defaultConfig, parsed);
  } catch (error) {
    reportWarning(
      `Failed to read toolkit config at ${configPath}. Using defaults.\n${
        String(error)
      }`,
    );
    return defaultConfig;
  }
}

function mergeToolkitConfig(
  base: Required<ToolkitConfig>,
  override: ToolkitConfig,
): Required<ToolkitConfig> {
  return {
    python: {
      packages: override.python?.packages ?? base.python.packages,
      optionalGroups: {
        ...base.python.optionalGroups,
        ...override.python?.optionalGroups,
      },
    },
    node: {
      packages: override.node?.packages ?? base.node.packages,
      installPlaywright: override.node?.installPlaywright ??
        base.node.installPlaywright,
    },
    containers: {
      composeFile: override.containers?.composeFile ??
        base.containers.composeFile,
      services: override.containers?.services ?? base.containers.services,
    },
    defaults: {
      extras: override.defaults?.extras ?? base.defaults.extras,
    },
  };
}

function resolveConfigPath(
  args: string[],
  defaultPath: string,
  repoRoot: string,
): string {
  const flagValue = getFlagValue(args, "--config");
  if (!flagValue) {
    return defaultPath;
  }
  if (isAbsolute(flagValue)) {
    return flagValue;
  }
  return join(repoRoot, flagValue);
}

function getFlagValue(args: string[], flag: string): string | null {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === flag) {
      return args[index + 1] ?? null;
    }
    if (arg.startsWith(`${flag}=`)) {
      return arg.slice(flag.length + 1);
    }
  }
  return null;
}

async function detectPython(): Promise<string | null> {
  if (await commandOk("python3", ["--version"])) {
    return "python3";
  }
  if (await commandOk("python", ["--version"])) {
    return "python";
  }
  return null;
}

async function detectPackageManager(): Promise<"pnpm" | "npm" | null> {
  if (await commandOk("pnpm", ["--version"])) {
    return "pnpm";
  }
  if (await commandOk("npm", ["--version"])) {
    return "npm";
  }
  return null;
}

async function detectDockerCompose(): Promise<
  { command: string; args: string[] } | null
> {
  if (await commandOk("docker", ["compose", "version"])) {
    return { command: "docker", args: ["compose"] };
  }
  if (await commandOk("docker-compose", ["--version"])) {
    return { command: "docker-compose", args: [] };
  }
  return null;
}

async function ensureNodePackageJson(targetDir: string): Promise<void> {
  const packageJsonPath = join(targetDir, "package.json");
  if (await pathExists(packageJsonPath)) {
    return;
  }
  const packageJson = {
    name: "ton-toolkit",
    version: "0.1.0",
    private: true,
    type: "module",
    description: "Sandbox project for TON toolkit JavaScript dependencies.",
  };
  await writeFile(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { encoding: "utf-8" },
  );
}

function getVenvPythonExecutable(venvPath: string): string {
  const executable = process.platform === "win32" ? "python.exe" : "python";
  const binDir = process.platform === "win32" ? "Scripts" : "bin";
  return join(venvPath, binDir, executable);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function ensureDir(targetDir: string): Promise<void> {
  await mkdir(targetDir, { recursive: true });
}

async function commandOk(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function runSteps(stepList: Step[]): Promise<void> {
  for (const step of stepList) {
    console.log(`\n→ ${step.title}`);
    console.log(`   ${formatCommand(step.command, step.args)}`);
    try {
      await runCommand(step.command, step.args, step.cwd);
    } catch (error) {
      if (step.optional) {
        console.warn(`⚠️  Optional step failed: ${step.title}`);
        console.warn(String(error));
        continue;
      }
      throw error;
    }
  }
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].join(" ");
}

async function runCommand(
  command: string,
  args: string[],
  cwd?: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", cwd });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
    child.on("error", (error) => reject(error));
  });
}

interface PlanContext {
  readonly configPath: string;
  readonly extrasExplicit: boolean;
}

function printPlan(
  stepList: Step[],
  selectedExtras: Set<string>,
  context: PlanContext,
): void {
  console.log("TON toolkit installation plan (dry run):\n");
  console.log(`Configuration file: ${context.configPath}`);
  if (!context.extrasExplicit) {
    console.log("(extras derived from configuration defaults)\n");
  }
  console.log("Selected optional Python groups:");
  if (selectedExtras.size === 0) {
    console.log(
      "  • none (pass --extras=validation,rl,tracking or --extras=all to enable)",
    );
  } else {
    for (const group of selectedExtras) {
      console.log(`  • ${group}`);
    }
  }
  if (stepList.length === 0) {
    console.log(
      "\nNo actions scheduled. All installation targets skipped or unavailable.",
    );
    return;
  }
  console.log("\nPlanned steps:");
  for (const step of stepList) {
    console.log(`  • ${step.title}`);
    console.log(`      ${formatCommand(step.command, step.args)}`);
    if (step.cwd) {
      console.log(`      cwd: ${step.cwd}`);
    }
    if (step.optional) {
      console.log("      (optional)");
    }
  }
  console.log("\nRe-run with --apply to execute these commands.");
}

function reportWarning(message: string): void {
  console.warn(`⚠️  ${message}`);
}
