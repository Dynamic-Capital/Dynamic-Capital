#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, "..");
const DEFAULT_TELEGRAM_WEBHOOK_FIXTURE = path.join(
  PROJECT_ROOT,
  "fixtures/telegram-webhook-info.json",
);

function loadEnvFile(relativePath) {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const result = dotenv.config({ path: absolutePath, override: false });
  if (result.error && result.error.code !== "ENOENT") {
    throw result.error;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const TASK_LIBRARY = {
  "sync-env": {
    id: "sync-env",
    label: "Sync .env and .env.local with .env.example (npm run sync-env)",
    command: "npm run sync-env",
    optional: false,
    docs: [
      "docs/coding-efficiency-checklist.md",
      "docs/dynamic-capital-checklist.md",
    ],
    notes: [
      "Appends any missing keys from .env.example into .env and .env.local without overwriting existing values.",
    ],
  },
  "repo-test": {
    id: "repo-test",
    label: "Run repository test suite (npm run test)",
    command: "npm run test",
    optional: false,
    docs: ["docs/coding-efficiency-checklist.md"],
    notes: [
      "Executes the static homepage regression check and the Deno-based unit tests.",
    ],
  },
  "dai-architecture-tests": {
    id: "dai-architecture-tests",
    label: "Run DAI architecture tests (pytest dai_architecture/tests)",
    command: "pytest dai_architecture/tests",
    optional: false,
    docs: [
      "docs/dai-dagi-dags-implementation-checklist.md",
      "docs/dynamic-ai-overview.md#5-operational-checklist",
    ],
    notes: [
      "Validates Phase 1–4 routing, residency, and governance guards for Dynamic AI.",
    ],
  },
  "dynamic-ai-tests": {
    id: "dynamic-ai-tests",
    label:
      "Run Dynamic AI persona and fusion tests (pytest tests/dynamic_ai tests_python/test_dynamic_ai_phase3.py)",
    command: "pytest tests/dynamic_ai tests_python/test_dynamic_ai_phase3.py",
    optional: false,
    docs: [
      "docs/dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-ai-dai",
      "docs/dynamic-ai-overview.md#5-operational-checklist",
    ],
    notes: [
      "Covers persona chaining, fusion logic, and planning outputs for DAI.",
    ],
  },
  "dynamic-agi-tests": {
    id: "dynamic-agi-tests",
    label: "Run Dynamic AGI oversight tests (pytest tests/dynamic_agi)",
    command: "pytest tests/dynamic_agi",
    optional: false,
    docs: [
      "docs/dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-agi-dagi",
      "docs/dynamic-agi-modular-framework.md",
    ],
    notes: [
      "Exercises DAGI self-improvement, mentorship, and orchestration diagnostics.",
    ],
  },
  "fix-and-check": {
    id: "fix-and-check",
    label: "Run repo fix-and-check script (bash scripts/fix_and_check.sh)",
    command: "bash scripts/fix_and_check.sh",
    optional: false,
    docs: [
      "docs/coding-efficiency-checklist.md",
      "docs/dynamic-ui-development-checklist.md",
    ],
    notes: [
      "Runs formatting, linting, and Deno type checks used throughout the project.",
    ],
  },
  verify: {
    id: "verify",
    label: "Run aggregated verification suite (npm run verify)",
    command: "npm run verify",
    optional: false,
    docs: [
      "docs/coding-efficiency-checklist.md",
      "docs/dynamic-capital-checklist.md",
    ],
    notes: [
      "Executes scripts/verify/verify_all.sh which bundles static, runtime, and integration safety checks.",
    ],
  },
  "web-lint": {
    id: "web-lint",
    label: "Run Next.js workspace lint (npm --workspace apps/web run lint)",
    command: "npm --workspace apps/web run lint",
    optional: false,
    docs: ["docs/dynamic-ui-development-checklist.md"],
    notes: [
      "Uses the Next.js ESLint configuration to validate Dynamic UI surfaces.",
    ],
  },
  "web-test": {
    id: "web-test",
    label: "Run Next.js workspace tests (npm --workspace apps/web run test)",
    command: "npm --workspace apps/web run test",
    optional: false,
    docs: ["docs/dynamic-ui-development-checklist.md"],
    notes: [
      "Executes workspace-level Deno tests for web routes and components.",
    ],
  },
  build: {
    id: "build",
    label: "Build Next.js app and landing snapshot (npm run build)",
    command: "npm run build",
    optional: true,
    docs: ["docs/dynamic-ui-development-checklist.md"],
    notes: [
      "Generates production bundles to surface hydration or build-time regressions.",
    ],
  },
  "build-miniapp": {
    id: "build-miniapp",
    label: "Build Supabase mini app bundle (npm run build:miniapp)",
    command: "npm run build:miniapp",
    optional: true,
    docs: [
      "docs/dynamic-ui-development-checklist.md",
      "docs/dynamic-capital-checklist.md",
    ],
    notes: [
      "Runs scripts/build-miniapp.sh to compile the Telegram mini app assets.",
    ],
  },
  "check-webhook": {
    id: "check-webhook",
    label:
      "Check Telegram webhook configuration (deno run -A scripts/check-webhook.ts)",
    command: "deno run -A scripts/check-webhook.ts",
    optional: false,
    docs: ["docs/dynamic-capital-checklist.md"],
    notes: [
      "Verifies that the Telegram bot webhook is reachable and configured with the expected URL.",
    ],
  },
  "audit-edge-hosts": {
    id: "audit-edge-hosts",
    label:
      "Audit Supabase edge hosts (deno run -A scripts/audit-edge-hosts.ts)",
    command: "deno run -A scripts/audit-edge-hosts.ts",
    optional: false,
    docs: ["docs/VARIABLES_AND_LINKS_CHECKLIST.md"],
    notes: ["Checks Supabase edge deployments for drift between environments."],
  },
  "check-linkage": {
    id: "check-linkage",
    label: "Check service linkage (deno run -A scripts/check-linkage.ts)",
    command: "deno run -A scripts/check-linkage.ts",
    optional: false,
    docs: ["docs/VARIABLES_AND_LINKS_CHECKLIST.md"],
    notes: [
      "Validates that environment variables and service URLs match their expected targets.",
    ],
  },
  "smoke-miniapp": {
    id: "smoke-miniapp",
    label: "Run mini app smoke test (deno run -A scripts/smoke-miniapp.ts)",
    command: "deno run -A scripts/smoke-miniapp.ts",
    optional: true,
    docs: ["docs/dynamic-capital-checklist.md"],
    notes: [
      "Executes scripted flows that mirror the production sanity checklist for the Telegram mini app.",
    ],
  },
  "smoke-tunnel": {
    id: "smoke-tunnel",
    label: "Run tunnel smoke test (node scripts/smoke-tunnel.mjs)",
    command: "node scripts/smoke-tunnel.mjs",
    optional: true,
    docs: ["docs/ngrok-troubleshooting.md"],
    notes: [
      "Confirms the ngrok helper wiring by inspecting dry-run output and forwarded flags.",
    ],
  },
  "supabase-cli-workflow": {
    id: "supabase-cli-workflow",
    label: "Run Supabase CLI workflow (bash scripts/supabase-cli-workflow.sh)",
    command: "bash scripts/supabase-cli-workflow.sh",
    optional: false,
    docs: ["docs/dynamic-capital-checklist.md", "docs/SETUP_SUMMARY.md"],
    notes: [
      "Logs in with SUPABASE_ACCESS_TOKEN, links the configured project, and pushes pending migrations.",
    ],
  },
  "deno-typecheck": {
    id: "deno-typecheck",
    label: "Run Deno typecheck (deno task typecheck)",
    command: "deno task typecheck",
    optional: false,
    docs: ["docs/SETUP_SUMMARY.md", "docs/coding-efficiency-checklist.md"],
    notes: [
      "Matches the standalone typecheck executed in CI (test-and-pr job).",
    ],
  },
  "npm-audit": {
    id: "npm-audit",
    label: "Run npm dependency audit (npm run audit)",
    command: "npm run audit",
    optional: false,
    docs: ["docs/SETUP_SUMMARY.md"],
    notes: [
      "Surfaces vulnerable packages to keep parity with the GitHub Actions audit step.",
    ],
  },
  "ci-test-and-pr": {
    id: "ci-test-and-pr",
    label: "Run CI parity checks (deno task ci)",
    command: "deno task ci",
    optional: false,
    docs: ["docs/SETUP_SUMMARY.md"],
    notes: [
      "Executes the aggregated formatting, linting, and test routine used by the test-and-pr workflow.",
    ],
  },
  "nft-collectible-validate": {
    id: "nft-collectible-validate",
    label:
      "Validate NFT checklist structure (node scripts/checklists/nft-collectible-validate.mjs)",
    command: "node scripts/checklists/nft-collectible-validate.mjs",
    optional: false,
    docs: ["docs/nft-collectible-launch-checklist.md"],
    notes: [
      "Ensures required sections and checklist items remain intact for the NFT launch playbook.",
    ],
  },
  "nft-collectible-tasks": {
    id: "nft-collectible-tasks",
    label:
      "Print NFT checklist tasks (node scripts/checklists/nft-collectible-tasks.mjs)",
    command: "node scripts/checklists/nft-collectible-tasks.mjs",
    docs: ["docs/nft-collectible-launch-checklist.md"],
    notes: [
      "Outputs grouped checklist items for planning docs or project trackers.",
    ],
  },
  "knowledge-base-verify": {
    id: "knowledge-base-verify",
    label:
      "Validate knowledge base metadata snapshot and local mirror (node scripts/checklists/knowledge-base-drop-verify.mjs)",
    command: "node scripts/checklists/knowledge-base-drop-verify.mjs",
    optional: false,
    docs: [
      "docs/knowledge-base-training-drop.md",
      "docs/onedrive-shares/evlumlqt-folder.md",
    ],
    notes: [
      "Checks that the OneDrive manifest for knowledge_base drops is mirrored locally with documented provenance.",
    ],
  },
  "podman-machine-verify": {
    id: "podman-machine-verify",
    label:
      "Validate Podman machine and default connection (node scripts/checklists/podman-machine-verify.mjs)",
    command: "node scripts/checklists/podman-machine-verify.mjs",
    optional: false,
    docs: ["docs/podman-github-integration-checklist.md"],
    notes: [
      "Starts the configured machine if needed, confirms it is running, inspects the VM metadata, and verifies the default named-pipe connection.",
    ],
  },
  "promote-digitalocean-primary-origin": {
    id: "promote-digitalocean-primary-origin",
    label:
      "Verify DigitalOcean primary-origin manifests (node scripts/checklists/promote-digitalocean-primary-origin.mjs)",
    command: "node scripts/checklists/promote-digitalocean-primary-origin.mjs",
    optional: false,
    docs: [
      "docs/DEPLOYMENT.md#step-by-step-promote-digitalocean-as-the-primary-origin",
    ],
    notes: [
      "Checks committed manifests, Supabase config, and DNS exports to ensure they all reference https://dynamic-capital.ondigitalocean.app before syncing infrastructure.",
    ],
  },
};

const CHECKLISTS = {
  "coding-efficiency": {
    name: "Coding Efficiency Checklist",
    doc: "docs/coding-efficiency-checklist.md",
    description:
      "Automation hooks referenced in the coding efficiency checklist.",
    tasks: ["sync-env", "repo-test", "fix-and-check", "verify"],
  },
  "dynamic-ui": {
    name: "Dynamic UI Frontend & Backend Checklist",
    doc: "docs/dynamic-ui-development-checklist.md",
    description: "Frontend and backend quality gates for Dynamic UI surfaces.",
    tasks: [
      "web-lint",
      "web-test",
      {
        task: "repo-test",
        optional: true,
        note: "Runs repository-wide tests alongside workspace coverage.",
      },
      "fix-and-check",
      "verify",
      {
        task: "build",
        optional: true,
        note: "Useful when verifying hydration and production builds locally.",
      },
      {
        task: "build-miniapp",
        optional: true,
        note:
          "Required when Dynamic UI changes impact the Telegram mini app shell.",
      },
    ],
  },
  "variables-and-links": {
    name: "Variables & Links Checklist",
    doc: "docs/VARIABLES_AND_LINKS_CHECKLIST.md",
    description: "Environment and outbound link audits.",
    tasks: ["audit-edge-hosts", "check-linkage"],
  },
  "go-live": {
    name: "Go-Live Checklist",
    doc: "docs/dynamic-capital-checklist.md#go-live-checklist",
    description: "Production readiness smoke tests.",
    tasks: [
      "check-webhook",
      {
        task: "smoke-miniapp",
        optional: true,
        note: "Complements manual go-live validation with scripted coverage.",
      },
      {
        task: "smoke-tunnel",
        optional: true,
        note: "Verifies tunnel arguments before allowing remote QA access.",
      },
    ],
  },
  "setup-followups": {
    name: "Setup Follow-Ups",
    doc: "docs/dynamic-capital-checklist.md#setup-follow-ups",
    description:
      "Supabase CLI linking and CI parity checks referenced after initial onboarding.",
    tasks: [
      "supabase-cli-workflow",
      "deno-typecheck",
      "repo-test",
      "npm-audit",
      "ci-test-and-pr",
    ],
  },
  "dynamic-capital": {
    name: "Dynamic Capital Aggregate Checklist",
    doc: "docs/dynamic-capital-checklist.md",
    description: "Automation-friendly portions of the project-wide checklist.",
    tasks: [
      "sync-env",
      "repo-test",
      "fix-and-check",
      "verify",
      "audit-edge-hosts",
      "check-linkage",
      "check-webhook",
      { task: "smoke-miniapp", optional: true },
      { task: "smoke-tunnel", optional: true },
    ],
  },
  "promote-digitalocean-primary-origin": {
    name: "Promote DigitalOcean Primary Origin",
    doc:
      "docs/DEPLOYMENT.md#step-by-step-promote-digitalocean-as-the-primary-origin",
    description:
      "Validates repository manifests before replaying the DigitalOcean promotion workflow.",
    tasks: ["promote-digitalocean-primary-origin"],
  },
  dai: {
    name: "Dynamic AI (DAI) Validation Checklist",
    doc: "docs/dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-ai-dai",
    description:
      "Domain-specific verification for Dynamic AI before orchestrator or persona updates.",
    tasks: ["dai-architecture-tests", "dynamic-ai-tests"],
  },
  dagi: {
    name: "Dynamic AGI (DAGI) Oversight Checklist",
    doc: "docs/dai-dagi-dct-dtl-dta-checklist-review.md#dynamic-agi-dagi",
    description:
      "Validates Dynamic AGI orchestration, mentorship feedback, and self-improvement loops.",
    tasks: ["dynamic-agi-tests"],
  },
  "nft-collectible": {
    name: "NFT Collectible Launch Checklist",
    doc: "docs/nft-collectible-launch-checklist.md",
    description:
      "Structural validations and exports for story-driven NFT drops.",
    tasks: [
      "nft-collectible-validate",
      "nft-collectible-tasks",
    ],
  },
  "knowledge-base-drop": {
    name: "Knowledge Base Drop Checklist",
    doc: "docs/knowledge-base-training-drop.md",
    description:
      "Automation checks for syncing OneDrive knowledge base drops into the repository.",
    tasks: ["knowledge-base-verify"],
  },
  "podman-github": {
    name: "Podman GitHub Integration Checklist",
    doc: "docs/podman-github-integration-checklist.md",
    description:
      "Validates Windows Podman machine connectivity before running repository workflows.",
    tasks: ["podman-machine-verify"],
  },
};

const HELP_TEXT =
  `Usage: npm run checklists -- [options]\n       node scripts/run-checklists.js --[options]\n\nOptions:\n  --checklist, -c <names>   Comma-separated checklist keys to run.\n  --only <task-ids>         Run the specified task IDs (comma-separated) without loading a checklist.\n  --skip <task-ids>         Skip the specified task IDs.\n  --include-optional        Include tasks marked as optional.\n  --continue-on-error       Continue executing tasks even if a required task fails.\n  --dry-run                 Print the resolved tasks without executing commands.\n  --list                    List available checklists and tasks.\n  --help, -h                Show this help message.\n`;

function parseArgs(argv) {
  const options = {
    checklists: [],
    only: [],
    skip: new Set(),
    includeOptional: false,
    dryRun: false,
    list: false,
    help: false,
    continueOnError: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--checklist":
      case "-c": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --checklist");
        }
        i += 1;
        options.checklists.push(
          ...value.split(",").map((item) => item.trim()).filter(Boolean),
        );
        break;
      }
      case "--only": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --only");
        }
        i += 1;
        options.only.push(
          ...value.split(",").map((item) => item.trim()).filter(Boolean),
        );
        break;
      }
      case "--skip": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --skip");
        }
        i += 1;
        value.split(",").map((item) => item.trim()).filter(Boolean).forEach((
          item,
        ) => options.skip.add(item));
        break;
      }
      case "--include-optional":
        options.includeOptional = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--list":
        options.list = true;
        break;
      case "--continue-on-error":
        options.continueOnError = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown flag: ${arg}`);
        } else {
          throw new Error(`Unexpected argument: ${arg}`);
        }
    }
  }

  return options;
}

function listChecklists() {
  console.log("Available checklists:\n");
  for (const [key, checklist] of Object.entries(CHECKLISTS)) {
    console.log(`- ${key}: ${checklist.name}`);
    if (checklist.description) {
      console.log(`    ${checklist.description}`);
    }
    if (checklist.doc) {
      console.log(`    Reference: ${checklist.doc}`);
    }
    const tasks = checklist.tasks.map((ref) => formatTaskRef(ref));
    tasks.forEach((task) => {
      const optionalText = task.optional ? " (optional)" : "";
      console.log(`    • ${task.id}${optionalText} — ${task.label}`);
    });
    console.log("");
  }
  console.log("Task library:\n");
  for (const task of Object.values(TASK_LIBRARY)) {
    const optionalText = task.optional ? " (optional)" : "";
    console.log(`- ${task.id}${optionalText}: ${task.label}`);
  }
  console.log("");
}

function formatTaskRef(ref) {
  const config = typeof ref === "string" ? { task: ref } : ref;
  const base = TASK_LIBRARY[config.task ?? config.id ?? ""];
  if (!base) {
    throw new Error(
      `Unknown task reference: ${
        typeof ref === "string" ? ref : JSON.stringify(ref)
      }`,
    );
  }
  return {
    id: base.id,
    label: config.label ?? base.label,
    optional: typeof config.optional === "boolean"
      ? config.optional
      : base.optional ?? false,
  };
}

function applyTelegramFixtureIfNeeded(tasks) {
  const needsWebhookCheck = tasks.some((task) => task.id === "check-webhook");
  if (!needsWebhookCheck) {
    return;
  }

  if (
    process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_WEBHOOK_INFO_PATH
  ) {
    return;
  }

  if (!fs.existsSync(DEFAULT_TELEGRAM_WEBHOOK_FIXTURE)) {
    console.warn(
      `[checklists] TELEGRAM_BOT_TOKEN missing and no TELEGRAM_WEBHOOK_INFO_PATH provided. Expected fixture at ${DEFAULT_TELEGRAM_WEBHOOK_FIXTURE}.`,
    );
    console.warn(
      "[checklists] Set TELEGRAM_WEBHOOK_INFO_PATH or TELEGRAM_BOT_TOKEN to run the webhook check.",
    );
    return;
  }

  process.env.TELEGRAM_WEBHOOK_INFO_PATH = DEFAULT_TELEGRAM_WEBHOOK_FIXTURE;
  const relativeFixturePath = path.relative(
    PROJECT_ROOT,
    DEFAULT_TELEGRAM_WEBHOOK_FIXTURE,
  );
  console.info(
    `[checklists] TELEGRAM_BOT_TOKEN missing; using ${relativeFixturePath} for webhook checks.`,
  );
}

function resolveTask(
  ref,
  checklistName,
  includeOptional,
  { forceInclude = false } = {},
) {
  const config = typeof ref === "string" ? { task: ref } : ref;
  const baseKey = config.task ?? config.id ?? "";
  const base = TASK_LIBRARY[baseKey];
  if (!base) {
    throw new Error(
      `Unknown task reference: ${
        typeof ref === "string" ? ref : JSON.stringify(ref)
      }`,
    );
  }

  const resolvedOptional = typeof config.optional === "boolean"
    ? config.optional
    : base.optional ?? false;
  if (resolvedOptional && !includeOptional && !forceInclude) {
    return null;
  }

  const docs = new Set(base.docs ?? []);
  if (config.docs) {
    for (const doc of config.docs) {
      docs.add(doc);
    }
  }

  const notes = [...(base.notes ?? [])];
  if (config.note) {
    notes.push(config.note);
  }
  if (Array.isArray(config.notes)) {
    notes.push(...config.notes);
  }

  const task = {
    id: base.id,
    label: config.label ?? base.label,
    command: config.command ?? base.command,
    optional: resolvedOptional,
    docs,
    notes,
    sources: new Set(checklistName ? [checklistName] : []),
  };

  return task;
}

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      env: createSanitizedNpmEnv(),
    });
    child.on("close", (code, signal) => {
      if (typeof code === "number" && code === 0) {
        resolve();
      } else if (typeof code === "number") {
        reject(new Error(`Command failed with exit code ${code}: ${command}`));
      } else {
        reject(
          new Error(
            `Command terminated by signal ${signal ?? "unknown"}: ${command}`,
          ),
        );
      }
    });
    child.on("error", (error) => {
      reject(error);
    });
  });
}

function mergeTask(target, source) {
  source.sources.forEach((value) => target.sources.add(value));
  source.docs.forEach((doc) => target.docs.add(doc));
  source.notes.forEach((note) => {
    if (!target.notes.includes(note)) {
      target.notes.push(note);
    }
  });
  target.optional = target.optional && source.optional;
}

function printUsage() {
  console.log(HELP_TEXT);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    return;
  }

  if (options.list) {
    listChecklists();
    return;
  }

  const plannedTasks = [];
  const taskMap = new Map();

  const addTask = (task) => {
    const existing = taskMap.get(task.id);
    if (existing) {
      mergeTask(existing, task);
    } else {
      taskMap.set(task.id, task);
      plannedTasks.push(task);
    }
  };

  if (options.only.length > 0) {
    options.only.forEach((taskId) => {
      const task = resolveTask(taskId, "manual", true, { forceInclude: true });
      if (!task) {
        return;
      }
      addTask(task);
    });
  } else {
    if (options.checklists.length === 0) {
      console.error(
        "No checklist selected. Use --checklist <key> or --list to see available options.",
      );
      printUsage();
      process.exit(1);
    }

    options.checklists.forEach((name) => {
      const checklist = CHECKLISTS[name];
      if (!checklist) {
        console.error(`Unknown checklist: ${name}`);
        printUsage();
        process.exit(1);
      }
      checklist.tasks.forEach((ref) => {
        const task = resolveTask(ref, name, options.includeOptional);
        if (!task) {
          return;
        }
        addTask(task);
      });
    });
  }

  const filteredTasks = plannedTasks.filter((task) =>
    !options.skip.has(task.id)
  );

  applyTelegramFixtureIfNeeded(filteredTasks);

  if (filteredTasks.length === 0) {
    console.log("No tasks to run after applying filters.");
    return;
  }

  console.log(`Planned tasks (${filteredTasks.length}):`);
  filteredTasks.forEach((task, index) => {
    const optionalText = task.optional ? "optional" : "required";
    const sources = task.sources.size > 0
      ? `Sources: ${Array.from(task.sources).join(", ")}`
      : "Sources: manual selection";
    console.log(`\n${index + 1}. ${task.label}`);
    console.log(`   Command: ${task.command}`);
    console.log(`   Type: ${optionalText}`);
    console.log(`   ${sources}`);
    if (task.docs.size > 0) {
      console.log(`   References: ${Array.from(task.docs).join(", ")}`);
    }
    if (task.notes.length > 0) {
      console.log(`   Notes: ${task.notes.join(" ")}`);
    }
  });

  if (options.dryRun) {
    console.log("\nDry run enabled. No commands were executed.");
    return;
  }

  const optionalFailures = [];
  const requiredFailures = [];

  for (let index = 0; index < filteredTasks.length; index += 1) {
    const task = filteredTasks[index];
    console.log(`\n[${index + 1}/${filteredTasks.length}] ${task.label}`);
    try {
      // eslint-disable-next-line no-await-in-loop
      await runCommand(task.command);
      console.log(`✅ Completed ${task.id}`);
    } catch (error) {
      if (task.optional) {
        console.warn(`⚠️  Optional task failed (${task.id}): ${error.message}`);
        optionalFailures.push({ task, error });
        continue;
      }

      console.error(`❌ Required task failed (${task.id}): ${error.message}`);
      requiredFailures.push({ task, error });
      if (!options.continueOnError) {
        process.exit(1);
      }
    }
  }

  if (requiredFailures.length > 0) {
    console.error("\nSummary: required task failures encountered.");
    requiredFailures.forEach(({ task, error }) => {
      console.error(`- ${task.id}: ${error.message}`);
    });
    process.exit(1);
  }

  if (optionalFailures.length > 0) {
    console.warn("\nSummary: optional task failures encountered.");
    optionalFailures.forEach(({ task, error }) => {
      console.warn(`- ${task.id}: ${error.message}`);
    });
  }

  console.log("\nAll requested checklist automation tasks completed.");
}

main().catch((error) => {
  console.error("Unexpected failure while running checklist automation.");
  console.error(error);
  process.exit(1);
});
