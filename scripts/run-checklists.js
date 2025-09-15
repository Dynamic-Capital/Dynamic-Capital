#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const TASK_LIBRARY = {
  'sync-env': {
    id: 'sync-env',
    label: 'Sync .env.local with .env.example (npm run sync-env)',
    command: 'npm run sync-env',
    optional: false,
    docs: ['docs/coding-efficiency-checklist.md', 'docs/dynamic-capital-checklist.md'],
    notes: ['Appends any missing keys from .env.example into .env.local without overwriting existing values.'],
  },
  'repo-test': {
    id: 'repo-test',
    label: 'Run repository test suite (npm run test)',
    command: 'npm run test',
    optional: false,
    docs: ['docs/coding-efficiency-checklist.md'],
    notes: ['Executes the static homepage regression check and the Deno-based unit tests.'],
  },
  'fix-and-check': {
    id: 'fix-and-check',
    label: 'Run repo fix-and-check script (bash scripts/fix_and_check.sh)',
    command: 'bash scripts/fix_and_check.sh',
    optional: false,
    docs: ['docs/coding-efficiency-checklist.md', 'docs/once-ui-development-checklist.md'],
    notes: ['Runs formatting, linting, and Deno type checks used throughout the project.'],
  },
  verify: {
    id: 'verify',
    label: 'Run aggregated verification suite (npm run verify)',
    command: 'npm run verify',
    optional: false,
    docs: ['docs/coding-efficiency-checklist.md', 'docs/dynamic-capital-checklist.md'],
    notes: ['Executes scripts/verify/verify_all.sh which bundles static, runtime, and integration safety checks.'],
  },
  'web-lint': {
    id: 'web-lint',
    label: 'Run Next.js workspace lint (npm --workspace apps/web run lint)',
    command: 'npm --workspace apps/web run lint',
    optional: false,
    docs: ['docs/once-ui-development-checklist.md'],
    notes: ['Uses the Next.js ESLint configuration to validate Once UI surfaces.'],
  },
  'web-test': {
    id: 'web-test',
    label: 'Run Next.js workspace tests (npm --workspace apps/web run test)',
    command: 'npm --workspace apps/web run test',
    optional: false,
    docs: ['docs/once-ui-development-checklist.md'],
    notes: ['Executes workspace-level Deno tests for web routes and components.'],
  },
  build: {
    id: 'build',
    label: 'Build landing and dashboard bundles (npm run build)',
    command: 'npm run build',
    optional: true,
    docs: ['docs/once-ui-development-checklist.md'],
    notes: ['Generates production bundles to surface hydration or build-time regressions.'],
  },
  'build-miniapp': {
    id: 'build-miniapp',
    label: 'Build Supabase mini app bundle (npm run build:miniapp)',
    command: 'npm run build:miniapp',
    optional: true,
    docs: ['docs/once-ui-development-checklist.md', 'docs/dynamic-capital-checklist.md'],
    notes: ['Runs scripts/build-miniapp.sh to compile the Telegram mini app assets.'],
  },
  'check-webhook': {
    id: 'check-webhook',
    label: 'Check Telegram webhook configuration (deno run -A scripts/check-webhook.ts)',
    command: 'deno run -A scripts/check-webhook.ts',
    optional: false,
    docs: ['docs/dynamic-capital-checklist.md'],
    notes: ['Verifies that the Telegram bot webhook is reachable and configured with the expected URL.'],
  },
  'audit-edge-hosts': {
    id: 'audit-edge-hosts',
    label: 'Audit Supabase edge hosts (deno run -A scripts/audit-edge-hosts.ts)',
    command: 'deno run -A scripts/audit-edge-hosts.ts',
    optional: false,
    docs: ['docs/VARIABLES_AND_LINKS_CHECKLIST.md'],
    notes: ['Checks Supabase edge deployments for drift between environments.'],
  },
  'check-linkage': {
    id: 'check-linkage',
    label: 'Check service linkage (deno run -A scripts/check-linkage.ts)',
    command: 'deno run -A scripts/check-linkage.ts',
    optional: false,
    docs: ['docs/VARIABLES_AND_LINKS_CHECKLIST.md'],
    notes: ['Validates that environment variables and service URLs match their expected targets.'],
  },
  'smoke-miniapp': {
    id: 'smoke-miniapp',
    label: 'Run mini app smoke test (deno run -A scripts/smoke-miniapp.ts)',
    command: 'deno run -A scripts/smoke-miniapp.ts',
    optional: true,
    docs: ['docs/dynamic-capital-checklist.md'],
    notes: ['Executes scripted flows that mirror the production sanity checklist for the Telegram mini app.'],
  },
};

const CHECKLISTS = {
  'coding-efficiency': {
    name: 'Coding Efficiency Checklist',
    doc: 'docs/coding-efficiency-checklist.md',
    description: 'Automation hooks referenced in the coding efficiency checklist.',
    tasks: ['sync-env', 'repo-test', 'fix-and-check', 'verify'],
  },
  'once-ui': {
    name: 'Once UI Frontend & Backend Checklist',
    doc: 'docs/once-ui-development-checklist.md',
    description: 'Frontend and backend quality gates for Once UI surfaces.',
    tasks: [
      'web-lint',
      'web-test',
      { task: 'repo-test', optional: true, note: 'Runs repository-wide tests alongside workspace coverage.' },
      'fix-and-check',
      'verify',
      { task: 'build', optional: true, note: 'Useful when verifying hydration and production builds locally.' },
      { task: 'build-miniapp', optional: true, note: 'Required when Once UI changes impact the Telegram mini app shell.' },
    ],
  },
  'variables-and-links': {
    name: 'Variables & Links Checklist',
    doc: 'docs/VARIABLES_AND_LINKS_CHECKLIST.md',
    description: 'Environment and outbound link audits.',
    tasks: ['audit-edge-hosts', 'check-linkage'],
  },
  'go-live': {
    name: 'Go-Live Checklist',
    doc: 'docs/dynamic-capital-checklist.md#go-live-checklist',
    description: 'Production readiness smoke tests.',
    tasks: [
      'check-webhook',
      { task: 'smoke-miniapp', optional: true, note: 'Complements manual go-live validation with scripted coverage.' },
    ],
  },
  'dynamic-capital': {
    name: 'Dynamic Capital Aggregate Checklist',
    doc: 'docs/dynamic-capital-checklist.md',
    description: 'Automation-friendly portions of the project-wide checklist.',
    tasks: [
      'sync-env',
      'repo-test',
      'fix-and-check',
      'verify',
      'audit-edge-hosts',
      'check-linkage',
      'check-webhook',
      { task: 'smoke-miniapp', optional: true },
    ],
  },
};

const HELP_TEXT = `Usage: npm run checklists -- [options]\n       node scripts/run-checklists.js --[options]\n\nOptions:\n  --checklist, -c <names>   Comma-separated checklist keys to run.\n  --only <task-ids>         Run the specified task IDs (comma-separated) without loading a checklist.\n  --skip <task-ids>         Skip the specified task IDs.\n  --include-optional        Include tasks marked as optional.\n  --continue-on-error       Continue executing tasks even if a required task fails.\n  --dry-run                 Print the resolved tasks without executing commands.\n  --list                    List available checklists and tasks.\n  --help, -h                Show this help message.\n`;

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
      case '--checklist':
      case '-c': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Missing value for --checklist');
        }
        i += 1;
        options.checklists.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
        break;
      }
      case '--only': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Missing value for --only');
        }
        i += 1;
        options.only.push(...value.split(',').map((item) => item.trim()).filter(Boolean));
        break;
      }
      case '--skip': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Missing value for --skip');
        }
        i += 1;
        value.split(',').map((item) => item.trim()).filter(Boolean).forEach((item) => options.skip.add(item));
        break;
      }
      case '--include-optional':
        options.includeOptional = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--list':
        options.list = true;
        break;
      case '--continue-on-error':
        options.continueOnError = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown flag: ${arg}`);
        } else {
          throw new Error(`Unexpected argument: ${arg}`);
        }
    }
  }

  return options;
}

function listChecklists() {
  console.log('Available checklists:\n');
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
      const optionalText = task.optional ? ' (optional)' : '';
      console.log(`    • ${task.id}${optionalText} — ${task.label}`);
    });
    console.log('');
  }
  console.log('Task library:\n');
  for (const task of Object.values(TASK_LIBRARY)) {
    const optionalText = task.optional ? ' (optional)' : '';
    console.log(`- ${task.id}${optionalText}: ${task.label}`);
  }
  console.log('');
}

function formatTaskRef(ref) {
  const config = typeof ref === 'string' ? { task: ref } : ref;
  const base = TASK_LIBRARY[config.task ?? config.id ?? ''];
  if (!base) {
    throw new Error(`Unknown task reference: ${typeof ref === 'string' ? ref : JSON.stringify(ref)}`);
  }
  return {
    id: base.id,
    label: config.label ?? base.label,
    optional: typeof config.optional === 'boolean' ? config.optional : base.optional ?? false,
  };
}

function resolveTask(ref, checklistName, includeOptional, { forceInclude = false } = {}) {
  const config = typeof ref === 'string' ? { task: ref } : ref;
  const baseKey = config.task ?? config.id ?? '';
  const base = TASK_LIBRARY[baseKey];
  if (!base) {
    throw new Error(`Unknown task reference: ${typeof ref === 'string' ? ref : JSON.stringify(ref)}`);
  }

  const resolvedOptional = typeof config.optional === 'boolean' ? config.optional : base.optional ?? false;
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
      stdio: 'inherit',
    });
    child.on('close', (code, signal) => {
      if (typeof code === 'number' && code === 0) {
        resolve();
      } else if (typeof code === 'number') {
        reject(new Error(`Command failed with exit code ${code}: ${command}`));
      } else {
        reject(new Error(`Command terminated by signal ${signal ?? 'unknown'}: ${command}`));
      }
    });
    child.on('error', (error) => {
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
      const task = resolveTask(taskId, 'manual', true, { forceInclude: true });
      if (!task) {
        return;
      }
      addTask(task);
    });
  } else {
    if (options.checklists.length === 0) {
      console.error('No checklist selected. Use --checklist <key> or --list to see available options.');
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

  const filteredTasks = plannedTasks.filter((task) => !options.skip.has(task.id));

  if (filteredTasks.length === 0) {
    console.log('No tasks to run after applying filters.');
    return;
  }

  console.log(`Planned tasks (${filteredTasks.length}):`);
  filteredTasks.forEach((task, index) => {
    const optionalText = task.optional ? 'optional' : 'required';
    const sources = task.sources.size > 0 ? `Sources: ${Array.from(task.sources).join(', ')}` : 'Sources: manual selection';
    console.log(`\n${index + 1}. ${task.label}`);
    console.log(`   Command: ${task.command}`);
    console.log(`   Type: ${optionalText}`);
    console.log(`   ${sources}`);
    if (task.docs.size > 0) {
      console.log(`   References: ${Array.from(task.docs).join(', ')}`);
    }
    if (task.notes.length > 0) {
      console.log(`   Notes: ${task.notes.join(' ')}`);
    }
  });

  if (options.dryRun) {
    console.log('\nDry run enabled. No commands were executed.');
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
    console.error('\nSummary: required task failures encountered.');
    requiredFailures.forEach(({ task, error }) => {
      console.error(`- ${task.id}: ${error.message}`);
    });
    process.exit(1);
  }

  if (optionalFailures.length > 0) {
    console.warn('\nSummary: optional task failures encountered.');
    optionalFailures.forEach(({ task, error }) => {
      console.warn(`- ${task.id}: ${error.message}`);
    });
  }

  console.log('\nAll requested checklist automation tasks completed.');
}

main().catch((error) => {
  console.error('Unexpected failure while running checklist automation.');
  console.error(error);
  process.exit(1);
});
