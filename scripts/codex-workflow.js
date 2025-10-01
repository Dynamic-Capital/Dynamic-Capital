#!/usr/bin/env node
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_AGENT_ID = "default";
const STATE_VERSION = 2;

const parsedArgs = parseArguments(process.argv.slice(2));
const flags = parsedArgs.flags;
const flagValues = parsedArgs.values;
const positional = parsedArgs.positional;

let mode = (positional[0] ?? "post-pull").toLowerCase();

if (flags.has("--help") || flags.has("-h")) {
  printUsage();
  process.exit(0);
}

if (mode === "postpull" || mode === "post") {
  mode = "post-pull";
}

const skipInstall = flags.has("--no-install");
const skipSync = flags.has("--no-sync");
const skipEnvCheck = flags.has("--no-env-check") || flags.has("--no-check");
const skipBuild = flags.has("--no-build") || flags.has("--skip-build");
const optionalBuild = flags.has("--build-optional") ||
  flags.has("--optional-build");
const runVerify = flags.has("--verify");
const skipVerify = flags.has("--no-verify");
const dryRun = flags.has("--dry-run");
const resetIssues = flags.has("--reset-issues") || flags.has("--clear-issues");
const disableSharedCache = flags.has("--no-shared-cache") ||
  flags.has("--disable-shared-cache") ||
  isTruthy(process.env.CODEX_DISABLE_SHARED_CACHE);

const agentValue = flagValues.get("--agent") ??
  flagValues.get("--agent-id") ??
  flagValues.get("--profile") ??
  process.env.CODEX_AGENT_ID ??
  process.env.CODEX_AGENT ??
  process.env.CODEX_PROFILE;
const agentId = sanitizeAgentId(agentValue);

const nodeModulesPath = path.join(repoRoot, "node_modules");
const hasNodeModules = () => existsSync(nodeModulesPath);
const stateFile = path.join(repoRoot, ".codex-workflow-state.json");

let state = loadState();
const agentState = getAgentState(state, agentId);
const sharedState = getSharedState(state);

if (resetIssues) {
  if (Object.keys(agentState.failures ?? {}).length > 0) {
    console.log(
      `♻️  Clearing stored Codex workflow issue history for agent "${agentId}".`,
    );
  }
  agentState.failures = {};
  saveState(state);
}

const context = {
  agentId,
  agentState,
  sharedState,
  state,
  disableSharedCache,
  mode,
};

const troubleshootingTips = {
  "npm install": [
    "Delete `node_modules` if the tree looks corrupted and reinstall.",
    "Ensure your Node.js version matches `.nvmrc` (try `nvm use`).",
    "If lockfile conflicts persist, run `npm ci` from a clean checkout.",
  ],
  "npm run sync-env": [
    "Verify `.env` and `.env.local` exist and are writable before syncing.",
    "Re-run `npm install` to make sure the sync script dependencies are available.",
    "If the Supabase CLI is required, install it via `npm install supabase --global` or use `npx supabase`.",
  ],
  "npx tsx scripts/check-env.ts": [
    "Double-check required environment variables in `.env`/`.env.local` or the active shell.",
    "Run `npm run sync-env` to copy placeholders from `.env.example`.",
    "Use `--no-env-check` temporarily only if you know the missing variables are safe to ignore.",
  ],
  "npm run build": [
    "Inspect the preceding Next.js build output for the root error.",
    "Run `npm run build` manually to reproduce the failure outside the helper.",
    "Use `--build-optional` if you only need to unblock other steps while debugging the build.",
  ],
  "npm run verify": [
    "Run `npm run lint` and `npm test` individually to narrow down the failure.",
    "Check generated snapshots or formatting—`npm run format` may resolve lint issues.",
    "Inspect the full verify logs for the exact command that failed and rerun it locally.",
  ],
  "node lovable-dev.js": [
    "Ensure no other dev server is already running on the same port.",
    "Reset environment variables if the dev server exits immediately.",
    "Review the terminal output above for stack traces from the Next.js dev server.",
  ],
};

const tasksByMode = {
  "post-pull": () => [
    command("Install npm dependencies", "npm install", {
      skip: skipInstall,
      optional: false,
      shared: sharedInstallOptions(),
    }),
    command("Sync local environment (npm run sync-env)", "npm run sync-env", {
      skip: skipSync,
      optional: true,
    }),
    command(
      "Check required environment variables",
      "npx tsx scripts/check-env.ts",
      {
        skip: skipEnvCheck,
        optional: false,
      },
    ),
    command("Run Next.js build", "npm run build", {
      skip: skipBuild,
      optional: optionalBuild,
    }),
    runVerify && !skipVerify
      ? command("Run repository verification suite", "npm run verify", {
        optional: false,
      })
      : null,
  ],
  dev: () => [
    command("Sync local environment (npm run sync-env)", "npm run sync-env", {
      skip: skipSync,
      optional: true,
    }),
    command("Start Dynamic development server", "node lovable-dev.js", {
      optional: false,
    }),
  ],
  build: () => [
    command(
      "Check required environment variables",
      "npx tsx scripts/check-env.ts",
      {
        skip: skipEnvCheck,
        optional: false,
      },
    ),
    command("Run Next.js build", "npm run build", {
      skip: skipBuild,
      optional: optionalBuild,
    }),
  ],
  verify: () => [
    command("Run repository verification suite", "npm run verify", {
      optional: false,
    }),
  ],
};

if (!tasksByMode[mode]) {
  console.error(`Unknown mode: ${mode}`);
  printUsage();
  process.exit(1);
}

const tasks = tasksByMode[mode]().filter(Boolean);

if (mode === "post-pull" && !skipInstall && hasNodeModules()) {
  console.log(
    "ℹ️  node_modules already present; use --no-install to skip reinstalling.",
  );
}

if (!tasks.length) {
  console.log("No tasks to run for the specified configuration.");
  process.exit(0);
}

console.log(`🧰 Codex workflow helper running in "${mode}" mode.`);
console.log(`   Agent: ${agentId}`);
if (flags.size > 0) {
  console.log(`   Flags: ${[...flags].join(", ")}`);
}
if (disableSharedCache) {
  console.log("   Shared cache: disabled for this run.");
}

printSharedTaskSummary(tasks, sharedState, agentId, disableSharedCache);
announceRecurringIssues(tasks, agentState);

if (dryRun) {
  console.log(
    "🔎 Dry run enabled. Listing planned steps without executing them:",
  );
  tasks.forEach((task, idx) => {
    console.log(
      ` ${idx + 1}. ${task.label}${task.optional ? " (optional)" : ""}`,
    );
  });
  process.exit(0);
}

runTasks(tasks, context);
console.log("\n🎉 Codex workflow tasks completed.");

function command(label, cmd, options = {}) {
  const { optional = false, skip = false, key, shared } = options;
  return {
    label,
    cmd,
    optional,
    key: key ?? cmd,
    shouldSkip: wrapSkip(skip),
    shared,
  };
}

function runTasks(taskList, context) {
  const { agentState, state } = context;
  for (let index = 0; index < taskList.length; index += 1) {
    const task = taskList[index];
    const step = index + 1;
    const key = taskKey(task);
    const hadPreviousFailures = Boolean(agentState.failures[key]);

    const skipDecision = evaluateSkip(task, context);
    if (skipDecision.skip) {
      console.log(`\n⏭️  Step ${step}/${taskList.length}: ${task.label}`);
      if (skipDecision.reason) {
        console.log(`   ${skipDecision.reason}`);
      }
      continue;
    }

    console.log(`\n➡️  Step ${step}/${taskList.length}: ${task.label}`);
    const startTime = Date.now();
    try {
      execSync(task.cmd, {
        stdio: "inherit",
        shell: true,
        env: createSanitizedNpmEnv(),
      });
      const durationMs = Date.now() - startTime;
      console.log(`✅ ${task.label}`);
      if (recordSuccess(agentState, task) && hadPreviousFailures) {
        console.log("   ℹ️  Previous issues for this step have been cleared.");
      }
      recordSharedSuccess(task, context, { durationMs });
    } catch (error) {
      const failureRecord = recordFailure(agentState, task, error);
      const recurrenceNotice = failureRecord.count > 1
        ? ` (seen ${failureRecord.count} times)`
        : "";

      if (task.optional) {
        console.warn(
          `⚠️  ${task.label} failed (optional)${recurrenceNotice}.`,
          error?.message ?? "",
        );
        printTroubleshootingTips(task, {
          header: "Optional step troubleshooting tips:",
        });
        printDynamicIssueHints(task, error, {
          header: "Detected quick fixes to try:",
        });
        continue;
      }

      console.error(`❌ ${task.label} failed${recurrenceNotice}.`);
      if (failureRecord.lastMessage) {
        console.error(`   Last error: ${failureRecord.lastMessage}`);
      }
      printTroubleshootingTips(task, {
        header: "Quick troubleshooting tips:",
      });
      printDynamicIssueHints(task, error);
      saveState(state);
      if (error?.status) {
        process.exit(error.status);
      }
      process.exit(1);
    }
  }

  saveState(state);
}

function printUsage() {
  const lines = [
    "Codex CLI workflow helper",
    "",
    "Usage: node scripts/codex-workflow.js [mode] [flags]",
    "",
    "Modes:",
    "  post-pull (default)  Prepare the repo after pulling from Codex CLI.",
    "  dev                  Sync env and start Dynamic dev server.",
    "  build                Run env checks and Next.js build.",
    "  verify               Run the verification suite.",
    "",
    "Flags:",
    "  --no-install         Skip `npm install` (post-pull).",
    "  --no-sync            Skip `npm run sync-env`.",
    "  --no-env-check       Skip env validation (not recommended).",
    "  --no-build           Skip `npm run build` (post-pull/build).",
    "  --build-optional     Treat Next.js build failures as warnings.",
    "  --verify             Run `npm run verify` after post-pull steps.",
    "  --no-verify          Skip verify step even if --verify provided.",
    "  --agent <id>         Track failures separately for a Codex agent.",
    "  --no-shared-cache    Disable shared success caching between agents.",
    "  --dry-run            Show planned steps without executing.",
    "  --reset-issues       Clear stored failure history for Codex workflow steps.",
    "  --help, -h           Show this message.",
  ];

  console.log(lines.join("\n"));
}

function taskKey(task) {
  return task.key ?? task.cmd;
}

function sharedKey(task) {
  if (task.shared && task.shared.key) {
    return task.shared.key;
  }
  return taskKey(task);
}

function freshState() {
  return {
    version: STATE_VERSION,
    agents: {},
    shared: { tasks: {} },
  };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getAgentState(state, agentId) {
  if (!isObject(state.agents)) {
    state.agents = {};
  }
  if (!isObject(state.agents[agentId])) {
    state.agents[agentId] = { failures: {} };
  }
  const agentState = state.agents[agentId];
  if (!isObject(agentState.failures)) {
    agentState.failures = {};
  }
  return agentState;
}

function getSharedState(state) {
  if (!isObject(state.shared)) {
    state.shared = { tasks: {} };
  }
  if (!isObject(state.shared.tasks)) {
    state.shared.tasks = {};
  }
  return state.shared;
}

function getSharedTasks(sharedState) {
  if (!isObject(sharedState.tasks)) {
    sharedState.tasks = {};
  }
  return sharedState.tasks;
}

function loadState() {
  if (!existsSync(stateFile)) {
    return freshState();
  }

  try {
    const contents = readFileSync(stateFile, "utf8");
    const parsed = JSON.parse(contents);
    if (!isObject(parsed)) {
      return freshState();
    }

    const state = freshState();
    if (isObject(parsed.agents)) {
      for (const [agentId, value] of Object.entries(parsed.agents)) {
        if (!isObject(value)) continue;
        state.agents[agentId] = {
          failures: isObject(value.failures) ? { ...value.failures } : {},
        };
      }
    }

    if (isObject(parsed.failures)) {
      const currentDefault = state.agents[DEFAULT_AGENT_ID] ?? { failures: {} };
      state.agents[DEFAULT_AGENT_ID] = {
        failures: {
          ...(isObject(currentDefault.failures) ? currentDefault.failures : {}),
          ...parsed.failures,
        },
      };
    }

    if (Object.keys(state.agents).length === 0) {
      state.agents[DEFAULT_AGENT_ID] = { failures: {} };
    }

    if (isObject(parsed.shared) && isObject(parsed.shared.tasks)) {
      const sharedTasks = {};
      for (const [key, value] of Object.entries(parsed.shared.tasks)) {
        if (isObject(value)) {
          sharedTasks[key] = value;
        }
      }
      state.shared.tasks = sharedTasks;
    }

    return state;
  } catch (error) {
    console.warn(
      "⚠️  Unable to read Codex workflow state. Starting fresh.",
      error?.message ?? error,
    );
    return freshState();
  }
}

function saveState(nextState) {
  nextState.version = STATE_VERSION;

  const agents = {};
  if (isObject(nextState.agents)) {
    for (const [agentId, value] of Object.entries(nextState.agents)) {
      if (!isObject(value)) continue;
      const failures = isObject(value.failures) ? value.failures : {};
      if (Object.keys(failures).length > 0) {
        agents[agentId] = { failures };
      }
    }
  }

  const sharedTasks = {};
  if (isObject(nextState.shared) && isObject(nextState.shared.tasks)) {
    for (const [key, value] of Object.entries(nextState.shared.tasks)) {
      if (isObject(value) && Object.keys(value).length > 0) {
        sharedTasks[key] = value;
      }
    }
  }

  nextState.agents = agents;
  nextState.shared = { tasks: sharedTasks };

  const payload = { version: STATE_VERSION };
  if (Object.keys(agents).length > 0) {
    payload.agents = agents;
  }
  if (Object.keys(sharedTasks).length > 0) {
    payload.shared = { tasks: sharedTasks };
  }

  if (!payload.agents && !payload.shared) {
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    nextState.agents = {};
    nextState.shared = { tasks: {} };
    return;
  }

  try {
    writeFileSync(stateFile, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.warn(
      "⚠️  Failed to persist Codex workflow state.",
      error?.message ?? error,
    );
  }
}

function wrapSkip(skip) {
  if (typeof skip === "function") {
    return (context) => normalizeSkipDecision(skip(context));
  }
  return () => normalizeSkipDecision(skip);
}

function normalizeSkipDecision(result) {
  if (typeof result === "boolean") {
    return { skip: result };
  }
  if (typeof result === "string") {
    return { skip: true, reason: result };
  }
  if (result && typeof result === "object") {
    if ("skip" in result) {
      return {
        skip: Boolean(result.skip),
        reason: result.reason,
      };
    }
  }
  return { skip: false };
}

function evaluateSkip(task, context) {
  if (typeof task.shouldSkip === "function") {
    const decision = normalizeSkipDecision(task.shouldSkip(context));
    if (decision.skip) {
      return decision;
    }
  }
  return evaluateSharedSkip(task, context);
}

function evaluateSharedSkip(task, context) {
  if (!task.shared || context.disableSharedCache) {
    return { skip: false };
  }

  const sharedTasks = getSharedTasks(context.sharedState);
  const key = sharedKey(task);
  const record = sharedTasks[key];
  if (!isObject(record)) {
    return { skip: false };
  }

  if (typeof task.shared.canReuse === "function") {
    try {
      if (!task.shared.canReuse(record, context)) {
        return { skip: false };
      }
    } catch (error) {
      console.warn(
        `⚠️  Shared reuse check failed for ${task.label}.`,
        error?.message ?? error,
      );
      return { skip: false };
    }
  }

  const fingerprint = resolveSharedFingerprint(task, task.shared, context);
  if (typeof task.shared.getFingerprint === "function") {
    if (!fingerprint || record.fingerprint !== fingerprint) {
      return { skip: false };
    }
  }

  if (typeof task.shared.isCacheValid === "function") {
    try {
      if (!task.shared.isCacheValid(record, context)) {
        return { skip: false };
      }
    } catch (error) {
      console.warn(
        `⚠️  Shared cache validation failed for ${task.label}.`,
        error?.message ?? error,
      );
      return { skip: false };
    }
  }

  if (typeof task.shared.onReuse === "function") {
    try {
      task.shared.onReuse(record, context);
    } catch (error) {
      console.warn(
        `⚠️  Shared reuse callback failed for ${task.label}.`,
        error?.message ?? error,
      );
    }
  }

  const message = typeof task.shared.skipMessage === "function"
    ? task.shared.skipMessage(record, context)
    : task.shared.skipMessage;

  return {
    skip: true,
    reason: message ??
      `Shared cache indicates "${task.label}" is up to date from ${
        record.agentId ?? "another Codex agent"
      }.`,
  };
}

function resolveSharedFingerprint(task, sharedOptions, context) {
  if (typeof sharedOptions.getFingerprint !== "function") {
    return undefined;
  }
  try {
    return sharedOptions.getFingerprint(context);
  } catch (error) {
    console.warn(
      `⚠️  Unable to compute fingerprint for ${task.label}.`,
      error?.message ?? error,
    );
    return undefined;
  }
}

function recordFailure(agentState, task, error) {
  if (!isObject(agentState.failures)) {
    agentState.failures = {};
  }
  const key = taskKey(task);
  const failures = agentState.failures;
  const existing = failures[key] ?? { count: 0 };
  const message = extractErrorSnippet(error);

  const updated = {
    ...existing,
    count: (existing.count ?? 0) + 1,
    label: task.label,
    lastStatus: typeof error?.status === "number" ? error.status : null,
    lastFailure: new Date().toISOString(),
    lastMessage: message,
  };

  failures[key] = updated;
  agentState.failures = failures;
  return updated;
}

function recordSuccess(agentState, task) {
  if (!isObject(agentState.failures)) {
    agentState.failures = {};
  }
  const key = taskKey(task);
  const failures = agentState.failures;
  if (failures[key]) {
    delete failures[key];
    agentState.failures = failures;
    return true;
  }
  return false;
}

function recordSharedSuccess(task, context, metadata = {}) {
  if (!task.shared) {
    return;
  }
  const sharedTasks = getSharedTasks(context.sharedState);
  const key = sharedKey(task);
  const previous = isObject(sharedTasks[key]) ? sharedTasks[key] : {};
  const fingerprint = resolveSharedFingerprint(task, task.shared, context);

  const record = {
    ...previous,
    lastSuccess: new Date().toISOString(),
    agentId: context.agentId,
    runs: typeof previous.runs === "number" ? previous.runs + 1 : 1,
  };

  if (fingerprint) {
    record.fingerprint = fingerprint;
  }

  if (metadata && typeof metadata === "object") {
    if (
      typeof metadata.durationMs === "number" &&
      Number.isFinite(metadata.durationMs) && metadata.durationMs >= 0
    ) {
      record.durationMs = metadata.durationMs;
    }
  }

  if (typeof task.shared.onSuccess === "function") {
    try {
      const extra = task.shared.onSuccess({ previous, context, fingerprint });
      if (extra && typeof extra === "object") {
        Object.assign(record, extra);
      }
    } catch (error) {
      console.warn(
        `⚠️  Shared success callback failed for ${task.label}.`,
        error?.message ?? error,
      );
    }
  }

  sharedTasks[key] = record;
}

function printSharedTaskSummary(
  taskList,
  sharedState,
  agentId,
  disableSharedCache,
) {
  if (!sharedState || !isObject(sharedState.tasks)) {
    return;
  }

  const sharedTasks = sharedState.tasks;
  const relevant = taskList.filter((task) =>
    task.shared && isObject(sharedTasks[sharedKey(task)])
  );
  if (relevant.length === 0) {
    return;
  }

  const suffix = disableSharedCache
    ? " (shared cache disabled for this run)"
    : "";
  console.log(`\n🤝  Shared Codex agent activity${suffix}:`);
  for (const task of relevant) {
    const record = sharedTasks[sharedKey(task)];
    const who = record.agentId
      ? `agent "${record.agentId}"`
      : "another Codex agent";
    const whenValue = record.lastSuccess
      ? formatTimestamp(record.lastSuccess)
      : "recently";
    const whenText = whenValue === "recently" ? "recently" : `on ${whenValue}`;
    const duration = record.durationMs
      ? formatDuration(record.durationMs)
      : null;
    const durationText = duration ? ` (took ${duration})` : "";
    console.log(
      `   • ${task.label} last completed by ${who} ${whenText}${durationText}.`,
    );
  }
}

function sharedInstallOptions() {
  return {
    key: "npm install",
    getFingerprint: () => computeDependencyFingerprint(),
    canReuse: () => hasNodeModules(),
    skipMessage: (record) => formatInstallSkipMessage(record),
  };
}

function computeDependencyFingerprint() {
  const files = ["package-lock.json", "package.json"];
  const hash = createHash("sha1");
  let seen = 0;

  for (const fileName of files) {
    const filePath = path.join(repoRoot, fileName);
    if (!existsSync(filePath)) continue;
    try {
      const contents = readFileSync(filePath);
      hash.update(fileName);
      hash.update(contents);
      seen += 1;
    } catch (error) {
      console.warn(
        `⚠️  Unable to read ${fileName} while computing dependency fingerprint.`,
        error?.message ?? error,
      );
      return undefined;
    }
  }

  if (seen === 0) {
    return undefined;
  }

  return hash.digest("hex");
}

function formatInstallSkipMessage(record) {
  const who = record.agentId
    ? `Codex agent "${record.agentId}"`
    : "Another Codex agent";
  const whenValue = record.lastSuccess
    ? formatTimestamp(record.lastSuccess)
    : "recently";
  const whenText = whenValue === "recently" ? " recently" : ` on ${whenValue}`;
  const duration = record.durationMs ? formatDuration(record.durationMs) : null;
  const durationText = duration ? ` (took ${duration})` : "";
  return `${who} already installed dependencies${whenText}${durationText}. Use --no-shared-cache to ignore shared results.`;
}

function formatDuration(durationMs) {
  if (
    typeof durationMs !== "number" || !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return null;
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  const seconds = durationMs / 1000;
  if (seconds < 60) {
    return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  if (remaining === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remaining}s`;
}

function parseArguments(args) {
  const positional = [];
  const flags = new Set();
  const values = new Map();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        const name = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        values.set(name, value);
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("-")) {
          values.set(arg, next);
          i += 1;
        } else {
          flags.add(arg);
        }
      }
      continue;
    }
    if (arg.startsWith("-") && arg !== "-") {
      flags.add(arg);
      continue;
    }
    positional.push(arg);
  }

  return { positional, flags, values };
}

function sanitizeAgentId(value) {
  if (value === undefined || value === null) {
    return DEFAULT_AGENT_ID;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return DEFAULT_AGENT_ID;
  }
  const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(
    /-+/g,
    "-",
  ).replace(/^-|-$/g, "");
  const limited = sanitized.slice(0, 64);
  return limited || DEFAULT_AGENT_ID;
}

function isTruthy(value) {
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function extractErrorSnippet(error) {
  if (!error) return undefined;
  const candidates = [error.stderr, error.stdout, error.message];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const text = Buffer.isBuffer(candidate)
      ? candidate.toString()
      : String(candidate);
    const snippet = text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (snippet) {
      return snippet.length > 200 ? `${snippet.slice(0, 197)}...` : snippet;
    }
  }
  return undefined;
}

function announceRecurringIssues(taskList, agentState) {
  const problems = [];
  for (const task of taskList) {
    const key = taskKey(task);
    const failure = agentState.failures?.[key];
    if (failure && failure.count >= 2) {
      problems.push({ task, failure });
    }
  }

  if (problems.length === 0) {
    return;
  }

  console.log("\n🔁 Repeated Codex workflow issues detected:");
  for (const { task, failure } of problems) {
    const when = failure.lastFailure
      ? formatTimestamp(failure.lastFailure)
      : "recently";
    console.log(
      `   • ${task.label} has failed ${failure.count} times (last seen ${when}).`,
    );
    if (failure.lastMessage) {
      console.log(`     Last error: ${failure.lastMessage}`);
    }
    printTroubleshootingTips(task, {
      indent: "     ",
      header: "Common fixes to try:",
    });
  }
}

function formatTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toISOString();
}

function printTroubleshootingTips(task, options = {}) {
  const { indent = "   ", header = "Troubleshooting tips:" } = options;
  const key = taskKey(task);
  const tips = troubleshootingTips[key] || troubleshootingTips[task.cmd] ||
    troubleshootingTips[task.label];
  if (!tips || tips.length === 0) {
    return;
  }

  console.log(`${indent}💡 ${header}`);
  tips.forEach((tip) => {
    console.log(`${indent}   - ${tip}`);
  });
}

function printDynamicIssueHints(task, error, options = {}) {
  const { indent = "   ", header = "Additional fixes to consider:" } = options;
  const hints = collectDynamicIssueHints(task, error);
  if (!hints || hints.length === 0) {
    return;
  }

  console.log(`${indent}🛠️  ${header}`);
  hints.forEach((hint) => {
    console.log(`${indent}   - ${hint}`);
  });
}

function collectDynamicIssueHints(task, error) {
  const text = gatherErrorText(error);
  if (!text) {
    return [];
  }

  const hints = new Set();

  const missingScriptRegex = /Missing script:\s*["']?([\w:-]+)["']?/gi;
  for (const match of text.matchAll?.(missingScriptRegex) ?? []) {
    const scriptName = match?.[1];
    if (!scriptName) continue;
    hints.add(
      `Define the "${scriptName}" script in package.json or regenerate it from Codex before rerunning this helper.`,
    );
  }

  const missingModuleRegex = /Cannot find module ['"]([^'"\n]+)['"]/gi;
  for (const match of text.matchAll?.(missingModuleRegex) ?? []) {
    const moduleName = match?.[1];
    if (!moduleName) continue;
    if (looksLikeFilePath(moduleName)) {
      const formatted = describeMissingPath(moduleName);
      hints.add(
        `Create the missing file at ${formatted} or update the import path if it moved.`,
      );
    } else if (!moduleName.startsWith("node:")) {
      hints.add(
        `Install the dependency via "npm install ${moduleName}" (or add it to package.json) so this command can resolve it.`,
      );
    }
  }

  const missingPackageRegex = /Cannot find package ['"]([^'"\n]+)['"]/gi;
  for (const match of text.matchAll?.(missingPackageRegex) ?? []) {
    const packageName = match?.[1];
    if (!packageName) continue;
    if (looksLikeFilePath(packageName)) {
      const formatted = describeMissingPath(packageName);
      hints.add(
        `Ensure the package at ${formatted} exists or adjust the import to the correct location.`,
      );
    } else if (!packageName.startsWith("node:")) {
      hints.add(
        `Install the npm package "${packageName}" (e.g. with npm install ${packageName}) before rerunning the workflow.`,
      );
    }
  }

  const enoentRegex = /ENOENT[^'"\n]*['"]([^'"\n]+)['"]/gi;
  for (const match of text.matchAll?.(enoentRegex) ?? []) {
    const missingPath = match?.[1];
    if (!missingPath) continue;
    const formatted = describeMissingPath(missingPath);
    hints.add(
      `Verify ${formatted} exists. Recreate it if the Codex export removed the file.`,
    );
  }

  if (
    error && typeof error.code === "string" &&
    error.code.toUpperCase() === "ENOENT" && error.path
  ) {
    const formatted = describeMissingPath(String(error.path));
    hints.add(
      `Verify ${formatted} exists. Recreate it if the Codex export removed the file.`,
    );
  }

  const commandNotFoundRegex =
    /(?:command not found:?\s+([\w@/.-]+))|(?:sh:\s*([\w@/.-]+):\s*not found)|(?:'([^']+)' is not recognized as an internal or external command)/gi;
  for (const match of text.matchAll?.(commandNotFoundRegex) ?? []) {
    const cmd = match?.[1] || match?.[2] || match?.[3];
    if (!cmd) continue;
    hints.add(
      `Install the "${cmd}" command or ensure it is available on your PATH (rerun npm install if it should be provided by dependencies).`,
    );
  }

  return [...hints];
}

function gatherErrorText(error) {
  if (!error) {
    return "";
  }

  const parts = [];
  if (error.stderr) {
    parts.push(bufferToString(error.stderr));
  }
  if (error.stdout) {
    parts.push(bufferToString(error.stdout));
  }
  if (error.message) {
    parts.push(String(error.message));
  }

  return parts
    .map((part) => (typeof part === "string" ? part : String(part)))
    .map((part) => part.replace(/\x1B\[[0-9;]*m/g, "").trim())
    .filter((part) => part.length > 0)
    .join("\n");
}

function bufferToString(value) {
  if (!value) {
    return "";
  }
  if (Buffer.isBuffer(value)) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => bufferToString(item)).join("\n");
  }
  return String(value);
}

function looksLikeFilePath(value) {
  if (!value) {
    return false;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith("file://")) {
    return true;
  }
  if (
    normalized.startsWith(".") || normalized.startsWith("/") ||
    normalized.includes("\\")
  ) {
    return true;
  }
  if (/^[A-Za-z]:[\\/]/.test(normalized)) {
    return true;
  }
  if (
    normalized.includes("/") &&
    !normalized.startsWith("@") &&
    (normalized.includes(".") ||
      normalized.includes("-") ||
      normalized.startsWith("scripts/") ||
      normalized.startsWith("apps/") ||
      normalized.startsWith("src/") ||
      normalized.startsWith("functions/") ||
      normalized.startsWith("packages/") ||
      normalized.startsWith("tools/") ||
      normalized.startsWith("scripts\\") ||
      normalized.startsWith("apps\\") ||
      normalized.startsWith("src\\"))
  ) {
    return true;
  }
  return false;
}

function describeMissingPath(value) {
  if (!value) {
    return "the expected path";
  }

  let normalized = String(value);
  if (normalized.startsWith("file://")) {
    try {
      normalized = fileURLToPath(normalized);
    } catch (error) {
      normalized = normalized.replace("file://", "");
    }
  }

  normalized = normalized.replace(/\\/g, "/");
  const repoPrefix = repoRoot.replace(/\\/g, "/");
  if (normalized.startsWith(repoPrefix)) {
    normalized = normalized.slice(repoPrefix.length);
    if (normalized.startsWith("/")) {
      normalized = normalized.slice(1);
    }
  }

  try {
    const relative = path.relative(repoRoot, normalized);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      normalized = relative.replace(/\\/g, "/");
    }
  } catch (error) {
    // ignore relative path conversion failures
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    return normalized;
  }

  if (!normalized.startsWith(".") && !normalized.startsWith("/")) {
    normalized = `./${normalized}`;
  }

  return normalized;
}
