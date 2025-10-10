#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const packages = [
  { name: "naming-engine", cwd: "naming-engine" },
  { name: "algorithms/vercel-webhook", cwd: "algorithms/vercel-webhook" },
  { name: "dynamic-capital-ton/apps/bot", cwd: "dynamic-capital-ton/apps/bot" },
];

const {
  values: {
    skip: skipPackages = [],
    only: onlyPackages = [],
    concurrency: rawConcurrency,
    "no-install": noInstall = false,
    "continue-on-error": continueOnError = false,
    "dry-run": dryRun = false,
  },
} = parseArgs({
  options: {
    skip: { type: "string", multiple: true },
    only: { type: "string", multiple: true },
    concurrency: { type: "string" },
    "no-install": { type: "boolean" },
    "continue-on-error": { type: "boolean" },
    "dry-run": { type: "boolean" },
  },
});

const normalizedSkip = new Set(
  skipPackages.map((value) => value.toLowerCase()),
);
const normalizedOnly = new Set(
  onlyPackages.map((value) => value.toLowerCase()),
);

const selectedPackages = packages.filter(({ name }) => {
  const lowered = name.toLowerCase();
  if (normalizedSkip.has(lowered)) {
    return false;
  }
  if (normalizedOnly.size > 0) {
    return normalizedOnly.has(lowered);
  }
  return true;
});

if (selectedPackages.length === 0) {
  console.error(
    "No tooling packages selected. Use --only or adjust the --skip filters.",
  );
  process.exit(1);
}

const detectParallelism = () => {
  const available = typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus()?.length ?? 1;
  return Math.max(1, Math.min(available, 4));
};

const parsedConcurrency = (() => {
  if (rawConcurrency === undefined) {
    return detectParallelism();
  }

  const parsed = Number.parseInt(rawConcurrency, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.warn(
      `⚠️  Ignoring invalid --concurrency value "${rawConcurrency}". Using sequential execution instead.`,
    );
    return 1;
  }
  return parsed;
})();

const concurrency = Math.max(1, parsedConcurrency);

const formatDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) {
    return "unknown";
  }
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(0)}ms`;
  }
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

async function runCommand(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with exit code ${code}.`,
          ),
        );
      }
    });
  });
}

const LOCK_FILES = ["package-lock.json", "npm-shrinkwrap.json"];

const readLockHash = async (packageCwd) => {
  for (const file of LOCK_FILES) {
    const fullPath = path.join(packageCwd, file);
    try {
      const contents = await readFile(fullPath);
      const hash = crypto.createHash("sha256").update(contents).digest("hex");
      return { hash, lockFile: file };
    } catch (error) {
      if (
        error && typeof error === "object" && "code" in error &&
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }
  return null;
};

async function ensureDependencies(name, packageCwd) {
  const nodeModulesPath = path.join(packageCwd, "node_modules");
  const stampFile = path.join(nodeModulesPath, ".npm-install.hash");

  if (noInstall) {
    if (!existsSync(nodeModulesPath)) {
      console.warn(
        `⚠️  Skipping install for ${name} because --no-install was provided, but node_modules is missing.`,
      );
    }
    return;
  }

  const lockInfo = await readLockHash(packageCwd);
  let previousHash = null;
  if (lockInfo && existsSync(stampFile)) {
    previousHash = (await readFile(stampFile, "utf8")).trim();
  }

  const nodeModulesExists = existsSync(nodeModulesPath);
  const installRequired = !nodeModulesExists ||
    (lockInfo && lockInfo.hash !== previousHash);

  if (!installRequired) {
    return;
  }

  console.log(`\n📦 Installing dependencies for ${name}...`);
  const installArgs = lockInfo ? ["ci"] : ["install"];
  await runCommand("npm", installArgs, {
    cwd: packageCwd,
    stdio: "inherit",
    env: process.env,
  });

  if (lockInfo) {
    await mkdir(nodeModulesPath, { recursive: true });
    await writeFile(stampFile, `${lockInfo.hash}\n`);
  }
}

async function runBuild({ name, cwd }) {
  const packageCwd = path.join(repoRoot, cwd);

  if (!existsSync(packageCwd)) {
    console.warn(`⚠️  Skipping ${name}; directory not found at ${packageCwd}`);
    return { status: "skipped", duration: 0 };
  }

  if (dryRun) {
    console.log(`• ${name} (${cwd}) → npm run build`);
    return { status: "planned", duration: 0 };
  }

  await ensureDependencies(name, packageCwd);

  console.log(`\n🚧 Building ${name}...`);

  const start = performance.now();

  await runCommand("npm", ["run", "build"], {
    cwd: packageCwd,
    stdio: "inherit",
    env: process.env,
  });

  const duration = performance.now() - start;

  console.log(`✅ ${name} build completed in ${formatDuration(duration)}.`);

  return { status: "success", duration };
}

const runAll = async () => {
  if (dryRun) {
    console.log("Dry-run mode: no tooling builds will be executed.\n");
    console.log("Planned tooling builds (respecting filters):");
    selectedPackages.forEach((pkg, index) => {
      console.log(` ${index + 1}. ${pkg.name} (${pkg.cwd})`);
    });
    console.log(
      `\nExecution strategy: ${
        concurrency === 1
          ? "sequential"
          : `parallel with up to ${concurrency} concurrent tasks`
      }.`,
    );
    return;
  }

  const queue = [...selectedPackages];
  const statuses = new Map();
  let encounteredError = false;

  const nextPackage = () => queue.shift();

  const worker = async () => {
    while (true) {
      if (encounteredError && !continueOnError) {
        return;
      }

      const pkg = nextPackage();
      if (!pkg) {
        return;
      }

      try {
        const result = await runBuild(pkg);
        statuses.set(pkg.name, result);
      } catch (error) {
        encounteredError = true;
        statuses.set(pkg.name, {
          status: "failed",
          duration: 0,
          error,
        });
        console.error(
          `❌ ${pkg.name} failed: ${
            error instanceof Error ? error.message : error
          }.`,
        );
        if (!continueOnError) {
          return;
        }
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const summaryLines = selectedPackages.map((pkg) => {
    const result = statuses.get(pkg.name);
    if (!result) {
      return `• ${pkg.name} — not started`;
    }

    const duration = formatDuration(result.duration ?? NaN);

    switch (result.status) {
      case "success":
        return `• ✅ ${pkg.name} (${duration})`;
      case "planned":
        return `• 📝 ${pkg.name} (planned)`;
      case "skipped":
        return `• ⚠️ ${pkg.name} skipped (missing directory)`;
      case "failed": {
        const message = result.error instanceof Error
          ? result.error.message
          : String(result.error ?? "unknown error");
        return `• ❌ ${pkg.name} — ${message}`;
      }
      default:
        return `• ⏳ ${pkg.name}`;
    }
  });

  console.log("\nTooling build summary:\n" + summaryLines.join("\n"));

  if (encounteredError && !continueOnError) {
    throw new Error("One or more tooling packages failed to build.");
  }
};

runAll().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
