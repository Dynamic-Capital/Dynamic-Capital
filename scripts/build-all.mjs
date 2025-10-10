#!/usr/bin/env node

import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const targets = [
  { name: "web", label: "Next.js web app", script: "build:web" },
  { name: "landing", label: "Marketing landing site", script: "build:landing" },
  {
    name: "miniapp",
    label: "Supabase miniapp functions",
    script: "build:miniapp",
  },
  { name: "tooling", label: "Tooling utilities", script: "build:tooling" },
];

const {
  values: {
    skip = [],
    only = [],
    concurrency: rawConcurrency,
    sequential = false,
    "continue-on-error": continueOnError = false,
    "dry-run": dryRun = false,
    "list-targets": listTargets = false,
  },
} = parseArgs({
  options: {
    skip: { type: "string", multiple: true },
    only: { type: "string", multiple: true },
    concurrency: { type: "string" },
    sequential: { type: "boolean" },
    "continue-on-error": { type: "boolean" },
    "dry-run": { type: "boolean" },
    "list-targets": { type: "boolean" },
  },
});

if (listTargets) {
  console.log("Available build targets:\n");
  for (const target of targets) {
    console.log(`• ${target.name} — ${target.label}`);
  }
  process.exit(0);
}

const normalizedSkip = new Set(skip.map((value) => value.toLowerCase()));
const normalizedOnly = new Set(only.map((value) => value.toLowerCase()));

const activeTargets = targets.filter(({ name }) => {
  if (normalizedSkip.has(name)) {
    return false;
  }
  if (normalizedOnly.size > 0) {
    return normalizedOnly.has(name);
  }
  return true;
});

if (activeTargets.length === 0) {
  const configuredTargets = normalizedOnly.size > 0
    ? [...normalizedOnly].join(", ")
    : "[none]";
  console.error(
    `No build targets selected. (--only: ${configuredTargets}, --skip: ${
      [...normalizedSkip].join(", ") || "[none]"
    })`,
  );
  process.exit(1);
}

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

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const runScript = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ["run", script], {
      cwd: ROOT_DIR,
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run ${script} exited with code ${code}`));
    });

    child.on("error", (error) => {
      reject(error);
    });
  });

const detectParallelism = () => {
  const available = typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus()?.length ?? 1;
  return Math.max(1, Math.min(available, 4));
};

const parsedConcurrency = (() => {
  if (sequential) {
    return 1;
  }
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

if (dryRun) {
  console.log("Dry-run mode: no build commands will be executed.\n");
  console.log("Planned build order:");
  activeTargets.forEach((target, index) => {
    console.log(
      ` ${
        index + 1
      }. ${target.label} (${target.name}) → npm run ${target.script}`,
    );
  });
  console.log(
    `\nExecution strategy: ${
      concurrency === 1
        ? "sequential"
        : `parallel with up to ${concurrency} concurrent tasks`
    }.`,
  );
  process.exit(0);
}

const runAll = async () => {
  const statuses = new Map();
  let encounteredError = false;
  let completed = 0;

  const queue = [...activeTargets];

  const nextTarget = () => queue.shift();

  const worker = async (workerId) => {
    while (true) {
      if (encounteredError && !continueOnError) {
        return;
      }

      const target = nextTarget();
      if (!target) {
        return;
      }

      const start = performance.now();
      statuses.set(target.name, { status: "running", startedAt: start });

      console.log(
        `\n🚀 [worker ${workerId}] Building ${target.label} (${target.name})...`,
      );

      try {
        await runScript(target.script);
        const duration = performance.now() - start;
        statuses.set(target.name, { status: "success", duration });
        completed += 1;
        console.log(
          `✅ Completed ${target.label} in ${
            formatDuration(duration)
          } (${completed}/${activeTargets.length}).`,
        );
      } catch (error) {
        const duration = performance.now() - start;
        statuses.set(target.name, { status: "failed", duration, error });
        encounteredError = true;
        console.error(
          `❌ ${target.label} failed after ${formatDuration(duration)}: ${
            error instanceof Error ? error.message : error
          }.`,
        );
        if (!continueOnError) {
          return;
        }
      }

      if (queue.length > 0 && concurrency > 1) {
        // Small delay to reduce log interleaving when multiple workers start simultaneously.
        await delay(10);
      }
    }
  };

  const workers = Array.from(
    { length: concurrency },
    (_, index) => worker(index + 1),
  );
  await Promise.all(workers);

  const summaryLines = activeTargets.map((target) => {
    const result = statuses.get(target.name);
    if (!result) {
      return `• ${target.label} — not started`;
    }

    const duration = formatDuration(result.duration ?? NaN);

    switch (result.status) {
      case "success":
        return `• ✅ ${target.label} (${duration})`;
      case "failed": {
        const message = result.error instanceof Error
          ? result.error.message
          : String(result.error ?? "unknown error");
        return `• ❌ ${target.label} (${duration}) — ${message}`;
      }
      default:
        return `• ⏳ ${target.label}`;
    }
  });

  console.log("\nBuild summary:\n" + summaryLines.join("\n"));

  if (encounteredError && !continueOnError) {
    throw new Error("One or more build targets failed.");
  }
};

runAll().catch((error) => {
  console.error(`\n❌ Build pipeline failed: ${error.message}`);
  process.exit(1);
});
