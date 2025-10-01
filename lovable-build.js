#!/usr/bin/env node

import { execSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  banner,
  celebrate,
  divider,
  error as logError,
  info,
  note,
  step,
  success,
  warn,
} from "./scripts/utils/friendly-logger.js";
import { createSanitizedNpmEnv } from "./scripts/utils/npm-env.mjs";
import {
  applyBrandingEnvDefaults,
  PRODUCTION_ALLOWED_ORIGINS,
  PRODUCTION_ORIGIN,
} from "./scripts/utils/branding-env.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory);
if (process.cwd() !== repositoryRoot) {
  process.chdir(repositoryRoot);
}

function parseListInput(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function parseCliOptions(argv) {
  const options = {
    serial: false,
    list: false,
    help: false,
    timings: false,
    only: [],
    skip: [],
    maxWorkers: undefined,
    unknown: [],
    warnings: [],
  };

  const tokens = [...argv];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--") {
      break;
    }
    if (!token.startsWith("--")) {
      continue;
    }

    const [flagName, inlineValue] = token.slice(2).split("=", 2);
    const flag = flagName.toLowerCase();
    const readValue = () => {
      if (inlineValue !== undefined) {
        return inlineValue;
      }
      const next = tokens[index + 1];
      if (next && !next.startsWith("--")) {
        index += 1;
        return next;
      }
      return undefined;
    };

    switch (flag) {
      case "serial":
        options.serial = true;
        break;
      case "list":
      case "list-tasks":
        options.list = true;
        break;
      case "help":
      case "h":
        options.help = true;
        break;
      case "timings":
        options.timings = true;
        break;
      case "only":
      case "task":
      case "tasks": {
        const value = readValue();
        if (value) {
          options.only.push(...parseListInput(value));
        } else {
          options.warnings.push("--only flag requires a value");
        }
        break;
      }
      case "skip": {
        const value = readValue();
        if (value) {
          options.skip.push(...parseListInput(value));
        } else {
          options.warnings.push("--skip flag requires a value");
        }
        break;
      }
      case "max-workers":
      case "workers": {
        const value = readValue();
        if (value) {
          const parsed = Number.parseInt(value, 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            options.maxWorkers = parsed;
          } else {
            options.warnings.push(`Invalid max worker count: ${value}`);
          }
        } else {
          options.warnings.push("--max-workers flag requires a numeric value");
        }
        break;
      }
      default:
        options.unknown.push(`--${flagName}`);
        break;
    }
  }

  return options;
}

function prepareFilters(values) {
  const seen = new Set();
  const prepared = [];
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    prepared.push({ raw: text, key });
  }
  return prepared;
}

function selectTasks(tasks, { only, skip }) {
  const normalisedTasks = new Map();
  for (const task of tasks) {
    normalisedTasks.set(task.id.toLowerCase(), task);
    normalisedTasks.set(task.label.toLowerCase(), task);
    if (task.aliases) {
      for (const alias of task.aliases) {
        normalisedTasks.set(alias.toLowerCase(), task);
      }
    }
    if (task.script) {
      normalisedTasks.set(task.script.toLowerCase(), task);
    }
  }

  const selected = [];
  const selectedSet = new Set();
  const addTask = (task) => {
    if (!selectedSet.has(task)) {
      selectedSet.add(task);
      selected.push(task);
    }
  };

  const unknownOnly = [];
  const preparedOnly = prepareFilters(only);
  if (preparedOnly.length > 0) {
    for (const filter of preparedOnly) {
      const task = normalisedTasks.get(filter.key);
      if (task) {
        addTask(task);
      } else {
        unknownOnly.push(filter.raw);
      }
    }
  } else {
    for (const task of tasks) {
      addTask(task);
    }
  }

  const skippedSet = new Set();
  const unknownSkip = [];
  const preparedSkip = prepareFilters(skip);
  if (preparedSkip.length > 0) {
    for (const filter of preparedSkip) {
      const task = normalisedTasks.get(filter.key);
      if (task) {
        if (selectedSet.has(task)) {
          skippedSet.add(task);
        }
      } else {
        unknownSkip.push(filter.raw);
      }
    }
  }

  let finalSelected = selected;
  let finalSelectedSet = selectedSet;
  if (skippedSet.size > 0) {
    finalSelected = selected.filter((task) => !skippedSet.has(task));
    finalSelectedSet = new Set(finalSelected);
  }

  const filteredOut = [];
  for (const task of tasks) {
    if (!finalSelectedSet.has(task)) {
      filteredOut.push(task);
    }
  }

  return { selected: finalSelected, filteredOut, unknownOnly, unknownSkip };
}

function readPackageScripts() {
  try {
    const contents = readFileSync(
      new URL("./package.json", import.meta.url),
      "utf8",
    );
    const parsed = JSON.parse(contents);
    if (
      parsed && typeof parsed.scripts === "object" && parsed.scripts !== null
    ) {
      return { scripts: parsed.scripts };
    }
    return { scripts: {} };
  } catch (error) {
    return { scripts: {}, error };
  }
}

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs)) {
    return "?";
  }
  if (durationMs < 1000) {
    return `${durationMs.toFixed(0)}ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function describeTask(task) {
  const segments = [`${task.id} – ${task.label}`];
  if (task.script) {
    segments.push(`npm run ${task.script}`);
  }
  if (task.description) {
    segments.push(task.description);
  }
  return segments.join(" | ");
}

function printTaskList(tasks) {
  divider();
  info("Available build tasks:", {
    details: tasks.map((task) => describeTask(task)),
  });
  divider();
}

function printHelp(tasks) {
  divider();
  info("Usage: node lovable-build.js [options]", {
    details: [
      "--serial              Run build tasks sequentially.",
      "--only a,b            Limit execution to the provided task IDs.",
      "--skip a,b            Exclude specific task IDs.",
      "--max-workers N       Cap parallel workers (default auto-detected).",
      "--timings             Always print task timing summaries.",
      "--list                List tasks and exit.",
    ],
  });
  note("Task identifiers:", {
    details: tasks.map((task) => `${task.id} (${task.label})`),
  });
  note("Environment overrides:", {
    details: [
      "LOVABLE_BUILD_SERIAL=1",
      "LOVABLE_BUILD_ONLY=task1,task2",
      "LOVABLE_BUILD_SKIP=task1",
      "LOVABLE_BUILD_MAX_WORKERS=2",
    ],
  });
  divider();
}

function determineDefaultWorkers(taskCount) {
  const cpuCount = Math.max(1, (cpus() || []).length || 1);
  if (taskCount <= 1) {
    return 1;
  }
  if (cpuCount <= 1) {
    return 1;
  }
  return Math.min(taskCount, Math.max(1, cpuCount - 1));
}

async function runTasksWithLimit(tasks, concurrency, runner) {
  const results = new Array(tasks.length);
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length));
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await runner(tasks[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

function summariseResult(result) {
  const status = result.code === 0 ? "✅" : "❌";
  const parts = [
    `${status} ${result.label} (${formatDuration(result.durationMs)})`,
  ];
  if (result.reason) {
    parts.push(`– ${result.reason}`);
  }
  return parts.join(" ");
}

async function runTask(task, packageScripts, baseEnv) {
  step(`${task.label} in progress...`);
  const start = performance.now();
  const env = task.env ? { ...baseEnv, ...task.env } : baseEnv;

  if (task.script && !packageScripts[task.script]) {
    const duration = performance.now() - start;
    logError(
      `${task.label} failed. Required npm script '${task.script}' is not defined.`,
      {
        details: [
          "Add the script to package.json or adjust the build filters.",
        ],
      },
    );
    divider();
    return {
      id: task.id,
      label: task.label,
      code: 1,
      durationMs: duration,
      reason: `missing npm script '${task.script}'`,
    };
  }

  return new Promise((resolve) => {
    let settled = false;

    const finalize = ({ code, signal, error }) => {
      if (settled) return;
      settled = true;
      const duration = performance.now() - start;

      if (code === 0) {
        success(`${task.label} completed successfully!`);
        divider();
        resolve({
          id: task.id,
          label: task.label,
          code,
          durationMs: duration,
        });
        return;
      }

      const details = [];
      if (signal) {
        details.push(`terminated by signal ${signal}`);
      }
      if (error) {
        details.push(error.message ? error.message : String(error));
      } else if (code !== undefined) {
        details.push(`exited with code ${code}`);
      }

      const reason = details.join(", ") || "failed";

      logError(`${task.label} failed. Check the output above for details.`, {
        details: details.length > 0 ? details : undefined,
      });
      divider();
      resolve({
        id: task.id,
        label: task.label,
        code: code ?? 1,
        durationMs: duration,
        reason,
      });
    };

    const child = spawn(task.command, task.args, {
      stdio: "inherit",
      env,
    });

    child.on("error", (error) => {
      finalize({ code: 1, error });
    });

    child.on("close", (code, signal) => {
      if (signal) {
        finalize({ code: 1, signal });
        return;
      }
      finalize({ code: code ?? 1 });
    });
  });
}

const {
  defaultedKeys,
  lovableOriginDefaulted,
  resolvedOrigin,
  supabaseFallbacks,
} = applyBrandingEnvDefaults({
  allowedOrigins: PRODUCTION_ALLOWED_ORIGINS,
  fallbackOrigin: PRODUCTION_ORIGIN,
});

banner(
  "Codex CLI · Friendly Build Mode",
  "Running Dynamic build tasks with cheerful updates.",
);
info(`Resolved origin preference: ${resolvedOrigin}`);

if (defaultedKeys.length > 0) {
  warn(
    "Origin variables were missing. Applying defaults to keep builds consistent.",
    {
      details: defaultedKeys,
    },
  );
} else {
  success("All origin-related environment variables are ready to go.");
}

if (lovableOriginDefaulted) {
  note(
    `LOVABLE_ORIGIN defaulted to ${resolvedOrigin} so Dynamic previews match the build.`,
  );
} else {
  info(
    `LOVABLE_ORIGIN already configured as ${process.env.LOVABLE_ORIGIN} for Dynamic previews.`,
  );
}

if (supabaseFallbacks.length > 0) {
  note(
    "Supabase credentials are not configured; placeholder values will be used for local build helpers.",
    {
      details: supabaseFallbacks,
    },
  );
}

const rawArgs = process.argv.slice(2);
const cliOptions = parseCliOptions(rawArgs);
const sanitizedNpmEnv = createSanitizedNpmEnv();

if (cliOptions.warnings.length > 0) {
  warn("Adjust the provided CLI flags before continuing.", {
    details: cliOptions.warnings,
  });
}

if (cliOptions.unknown.length > 0) {
  warn("Ignoring unknown flags for lovable-build.js.", {
    details: cliOptions.unknown,
  });
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const buildTasks = [
  {
    id: "next",
    label: "Next.js build",
    script: "build",
    command: npmCommand,
    args: ["run", "build"],
    description: "Build the Next.js dashboard for production.",
    aliases: ["dashboard", "web"],
  },
  {
    id: "miniapp",
    label: "Miniapp build",
    script: "build:miniapp",
    command: npmCommand,
    args: ["run", "build:miniapp"],
    description: "Assemble the Telegram miniapp bundle.",
    aliases: ["mini-app", "telegram"],
  },
];

if (cliOptions.help) {
  printHelp(buildTasks);
  process.exit(0);
}

if (cliOptions.list) {
  printTaskList(buildTasks);
  process.exit(0);
}

divider();
step("Ensuring required environment variables are present...");
try {
  execSync("npx tsx scripts/check-env.ts", {
    stdio: "inherit",
    env: sanitizedNpmEnv,
  });
  success("Environment check passed.");
} catch (error) {
  logError("Environment check failed. Fix the issues above before building.", {
    details: error?.message ? [error.message] : undefined,
  });
  process.exit(1);
}

const runSerial = cliOptions.serial || process.env.LOVABLE_BUILD_SERIAL === "1";
const envOnly = parseListInput(process.env.LOVABLE_BUILD_ONLY);
const envSkip = parseListInput(process.env.LOVABLE_BUILD_SKIP);
const combinedOnly = [...cliOptions.only, ...envOnly];
const combinedSkip = [...cliOptions.skip, ...envSkip];

const { selected: selectedTasks, filteredOut, unknownOnly, unknownSkip } =
  selectTasks(
    buildTasks,
    { only: combinedOnly, skip: combinedSkip },
  );

if (unknownOnly.length > 0) {
  warn("Unknown task identifiers supplied to --only.", {
    details: unknownOnly,
  });
}

if (unknownSkip.length > 0) {
  warn("Unknown task identifiers supplied to --skip.", {
    details: unknownSkip,
  });
}

if (selectedTasks.length === 0) {
  logError("No build tasks matched the requested filters.", {
    details: [
      "Update --only/--skip or the LOVABLE_BUILD_* environment variables.",
    ],
  });
  process.exit(1);
}

const filtersApplied = combinedOnly.length > 0 || combinedSkip.length > 0;

if (filtersApplied && filteredOut.length > 0) {
  note("Skipping build tasks via filters:", {
    details: filteredOut.map((task) => `${task.label} (${task.id})`),
  });
}

note("Executing build tasks:", {
  details: selectedTasks.map((task) => `${task.label} (${task.id})`),
});

const { scripts: packageScripts, error: packageScriptsError } =
  readPackageScripts();
if (packageScriptsError) {
  warn("Unable to verify npm scripts before running builds.", {
    details: packageScriptsError.message
      ? [packageScriptsError.message]
      : undefined,
  });
}

let envMaxWorkers;
const envMaxWorkersValue = process.env.LOVABLE_BUILD_MAX_WORKERS;
if (envMaxWorkersValue) {
  envMaxWorkers = parsePositiveInteger(envMaxWorkersValue);
  if (!envMaxWorkers) {
    warn(
      `Ignoring invalid LOVABLE_BUILD_MAX_WORKERS value: ${envMaxWorkersValue}`,
    );
  }
}

let workerCount = runSerial ? 1 : cliOptions.maxWorkers ?? envMaxWorkers ??
  determineDefaultWorkers(selectedTasks.length);
workerCount = Math.max(1, Math.min(workerCount, selectedTasks.length));

const concurrencyDetail = runSerial
  ? undefined
  : cliOptions.maxWorkers
  ? `configured via --max-workers=${cliOptions.maxWorkers}`
  : envMaxWorkers
  ? `configured via LOVABLE_BUILD_MAX_WORKERS=${envMaxWorkers}`
  : (() => {
    const cpuCount = Math.max(1, (cpus() || []).length || 1);
    return `auto-detected from ${cpuCount} CPU core${
      cpuCount === 1 ? "" : "s"
    }`;
  })();

if (workerCount === 1) {
  if (runSerial && selectedTasks.length > 1) {
    note("Serial mode requested. Build tasks will run one after another.");
  } else if (selectedTasks.length === 1) {
    info("Single build task selected; running sequentially.");
  } else {
    info(
      "Concurrency limited to a single worker; build tasks will run sequentially.",
      {
        details: concurrencyDetail ? [concurrencyDetail] : undefined,
      },
    );
  }
} else {
  info(
    `Running build tasks with up to ${workerCount} concurrent worker${
      workerCount === 1 ? "" : "s"
    }.`,
    {
      details: concurrencyDetail ? [concurrencyDetail] : undefined,
    },
  );
}

const overallStart = performance.now();
const results = await runTasksWithLimit(
  selectedTasks,
  workerCount,
  (task) => runTask(task, packageScripts, sanitizedNpmEnv),
);
const overallElapsed = performance.now() - overallStart;

const failed = results.filter((result) => result.code !== 0);
const summaryLines = results.map((result) => summariseResult(result));
if (
  summaryLines.length > 0 &&
  (cliOptions.timings || results.length > 1 || failed.length > 0)
) {
  summaryLines.push(`Overall elapsed time: ${formatDuration(overallElapsed)}`);
  note("Build task summary:", { details: summaryLines });
}

if (failed.length === 0) {
  celebrate("All Codex CLI build tasks finished with a smile!");
  process.exitCode = 0;
} else {
  warn("Some build tasks did not finish successfully. Review the logs above.");
  process.exitCode = 1;
}
