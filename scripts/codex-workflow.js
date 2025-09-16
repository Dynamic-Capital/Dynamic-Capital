#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith('-') && arg !== '-'));
const modeArg = argv.find((arg) => !arg.startsWith('-'));
let mode = (modeArg ?? 'post-pull').toLowerCase();

if (flags.has('--help') || flags.has('-h')) {
  printUsage();
  process.exit(0);
}

if (mode === 'postpull' || mode === 'post') {
  mode = 'post-pull';
}

const skipInstall = flags.has('--no-install');
const skipSync = flags.has('--no-sync');
const skipEnvCheck = flags.has('--no-env-check') || flags.has('--no-check');
const skipBuild = flags.has('--no-build') || flags.has('--skip-build');
const optionalBuild = flags.has('--build-optional') || flags.has('--optional-build');
const runVerify = flags.has('--verify');
const skipVerify = flags.has('--no-verify');
const dryRun = flags.has('--dry-run');
const resetIssues = flags.has('--reset-issues') || flags.has('--clear-issues');

const hasNodeModules = existsSync(path.join(repoRoot, 'node_modules'));
const stateFile = path.join(repoRoot, '.codex-workflow-state.json');

let state = loadState();

if (resetIssues) {
  if (Object.keys(state.failures).length > 0) {
    console.log('♻️  Clearing stored Codex workflow issue history.');
  }
  state = { failures: {} };
  saveState(state);
}

const troubleshootingTips = {
  'npm install': [
    'Delete `node_modules` if the tree looks corrupted and reinstall.',
    'Ensure your Node.js version matches `.nvmrc` (try `nvm use`).',
    'If lockfile conflicts persist, run `npm ci` from a clean checkout.',
  ],
  'npm run sync-env': [
    'Verify `.env.local` exists and is writable before syncing.',
    'Re-run `npm install` to make sure the sync script dependencies are available.',
    'If the Supabase CLI is required, install it via `npm install supabase --global` or use `npx supabase`.',
  ],
  'npx tsx scripts/check-env.ts': [
    'Double-check required environment variables in `.env.local` or the active shell.',
    'Run `npm run sync-env` to copy placeholders from `.env.example`.',
    'Use `--no-env-check` temporarily only if you know the missing variables are safe to ignore.',
  ],
  'node lovable-build.js': [
    'Inspect the preceding Next.js or mini app build output for the root error.',
    'Try `npm run build` directly to reproduce the failure outside the helper.',
    'Use `--build-optional` if you only need to unblock other steps while debugging the build.',
  ],
  'npm run verify': [
    'Run `npm run lint` and `npm test` individually to narrow down the failure.',
    'Check generated snapshots or formatting—`npm run format` may resolve lint issues.',
    'Inspect the full verify logs for the exact command that failed and rerun it locally.',
  ],
  'node lovable-dev.js': [
    'Ensure no other dev server is already running on the same port.',
    'Reset environment variables if the dev server exits immediately.',
    'Review the terminal output above for stack traces from the Next.js dev server.',
  ],
};

const tasksByMode = {
  'post-pull': () => [
    command('Install npm dependencies', 'npm install', {
      skip: skipInstall,
      optional: false,
    }),
    command('Sync local environment (npm run sync-env)', 'npm run sync-env', {
      skip: skipSync,
      optional: true,
    }),
    command('Check required environment variables', 'npx tsx scripts/check-env.ts', {
      skip: skipEnvCheck,
      optional: false,
    }),
    command('Run Lovable build (Next.js + mini app)', 'node lovable-build.js', {
      skip: skipBuild,
      optional: optionalBuild,
    }),
    runVerify && !skipVerify
      ? command('Run repository verification suite', 'npm run verify', {
          optional: false,
        })
      : null,
  ],
  dev: () => [
    command('Sync local environment (npm run sync-env)', 'npm run sync-env', {
      skip: skipSync,
      optional: true,
    }),
    command('Start Lovable development server', 'node lovable-dev.js', {
      optional: false,
    }),
  ],
  build: () => [
    command('Check required environment variables', 'npx tsx scripts/check-env.ts', {
      skip: skipEnvCheck,
      optional: false,
    }),
    command('Run Lovable build (Next.js + mini app)', 'node lovable-build.js', {
      skip: skipBuild,
      optional: optionalBuild,
    }),
  ],
  verify: () => [
    command('Run repository verification suite', 'npm run verify', {
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

if (mode === 'post-pull' && !skipInstall && hasNodeModules) {
  console.log('ℹ️  node_modules already present; use --no-install to skip reinstalling.');
}

if (!tasks.length) {
  console.log('No tasks to run for the specified configuration.');
  process.exit(0);
}

console.log(`🧰 Codex workflow helper running in "${mode}" mode.`);
if (flags.size > 0) {
  console.log(`   Flags: ${[...flags].join(', ')}`);
}

announceRecurringIssues(tasks, state);

if (dryRun) {
  console.log('🔎 Dry run enabled. Listing planned steps without executing them:');
  tasks.forEach((task, idx) => {
    console.log(` ${idx + 1}. ${task.label}${task.optional ? ' (optional)' : ''}`);
  });
  process.exit(0);
}

runTasks(tasks, state);
console.log('\n🎉 Codex workflow tasks completed.');

function command(label, cmd, options = {}) {
  const { optional = false, skip = false, key } = options;
  if (skip) return null;
  return { label, cmd, optional, key: key ?? cmd };
}

function runTasks(taskList, currentState) {
  for (let index = 0; index < taskList.length; index += 1) {
    const task = taskList[index];
    const step = index + 1;
    const key = taskKey(task);
    const hadPreviousFailures = Boolean(currentState.failures[key]);

    console.log(`\n➡️  Step ${step}/${taskList.length}: ${task.label}`);
    try {
      execSync(task.cmd, { stdio: 'inherit', shell: true });
      console.log(`✅ ${task.label}`);
      if (recordSuccess(currentState, task) && hadPreviousFailures) {
        console.log('   ℹ️  Previous issues for this step have been cleared.');
      }
    } catch (error) {
      const failureRecord = recordFailure(currentState, task, error);
      const recurrenceNotice =
        failureRecord.count > 1 ? ` (seen ${failureRecord.count} times)` : '';

      if (task.optional) {
        console.warn(`⚠️  ${task.label} failed (optional)${recurrenceNotice}.`, error?.message ?? '');
        printTroubleshootingTips(task, {
          header: 'Optional step troubleshooting tips:',
        });
        continue;
      }

      console.error(`❌ ${task.label} failed${recurrenceNotice}.`);
      if (failureRecord.lastMessage) {
        console.error(`   Last error: ${failureRecord.lastMessage}`);
      }
      printTroubleshootingTips(task, {
        header: 'Quick troubleshooting tips:',
      });
      saveState(currentState);
      if (error?.status) {
        process.exit(error.status);
      }
      process.exit(1);
    }
  }

  saveState(currentState);
}

function printUsage() {
  console.log(`Codex CLI workflow helper\n\nUsage: node scripts/codex-workflow.js [mode] [flags]\n\nModes:\n  post-pull (default)  Prepare the repo after pulling from Codex CLI.\n  dev                  Sync env and start Lovable dev server.\n  build                Run env checks and Lovable build.\n  verify               Run the verification suite.\n\nFlags:\n  --no-install         Skip \`npm install\` (post-pull).\n  --no-sync            Skip \`npm run sync-env\`.\n  --no-env-check       Skip env validation (not recommended).\n  --no-build           Skip Lovable build (post-pull/build).\n  --build-optional     Treat Lovable build failures as warnings.\n  --verify             Run \`npm run verify\` after post-pull steps.\n  --no-verify          Skip verify step even if --verify provided.\n  --dry-run            Show planned steps without executing.\n  --reset-issues       Clear stored failure history for Codex workflow steps.\n  --help, -h           Show this message.\n`);
}

function taskKey(task) {
  return task.key ?? task.cmd;
}

function loadState() {
  if (!existsSync(stateFile)) {
    return { failures: {} };
  }

  try {
    const contents = readFileSync(stateFile, 'utf8');
    const parsed = JSON.parse(contents);
    if (!parsed || typeof parsed !== 'object') {
      return { failures: {} };
    }
    if (!parsed.failures || typeof parsed.failures !== 'object') {
      parsed.failures = {};
    }
    return parsed;
  } catch (error) {
    console.warn('⚠️  Unable to read Codex workflow state. Starting fresh.', error?.message ?? error);
    return { failures: {} };
  }
}

function saveState(nextState) {
  const failures = nextState.failures ?? {};
  const keys = Object.keys(failures);
  if (keys.length === 0) {
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    return;
  }

  try {
    writeFileSync(stateFile, JSON.stringify({ failures }, null, 2));
  } catch (error) {
    console.warn('⚠️  Failed to persist Codex workflow state.', error?.message ?? error);
  }
}

function recordFailure(currentState, task, error) {
  const key = taskKey(task);
  const failures = currentState.failures ?? {};
  const existing = failures[key] ?? { count: 0 };
  const message = extractErrorSnippet(error);

  const updated = {
    ...existing,
    count: (existing.count ?? 0) + 1,
    label: task.label,
    lastStatus: typeof error?.status === 'number' ? error.status : null,
    lastFailure: new Date().toISOString(),
    lastMessage: message,
  };

  failures[key] = updated;
  currentState.failures = failures;
  return updated;
}

function recordSuccess(currentState, task) {
  const key = taskKey(task);
  const failures = currentState.failures ?? {};
  if (failures[key]) {
    delete failures[key];
    currentState.failures = failures;
    return true;
  }
  return false;
}

function extractErrorSnippet(error) {
  if (!error) return undefined;
  const candidates = [error.stderr, error.stdout, error.message];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const text = Buffer.isBuffer(candidate) ? candidate.toString() : String(candidate);
    const snippet = text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (snippet) {
      return snippet.length > 200 ? `${snippet.slice(0, 197)}...` : snippet;
    }
  }
  return undefined;
}

function announceRecurringIssues(taskList, currentState) {
  const problems = [];
  for (const task of taskList) {
    const key = taskKey(task);
    const failure = currentState.failures?.[key];
    if (failure && failure.count >= 2) {
      problems.push({ task, failure });
    }
  }

  if (problems.length === 0) {
    return;
  }

  console.log('\n🔁 Repeated Codex workflow issues detected:');
  for (const { task, failure } of problems) {
    const when = failure.lastFailure ? formatTimestamp(failure.lastFailure) : 'recently';
    console.log(`   • ${task.label} has failed ${failure.count} times (last seen ${when}).`);
    if (failure.lastMessage) {
      console.log(`     Last error: ${failure.lastMessage}`);
    }
    printTroubleshootingTips(task, {
      indent: '     ',
      header: 'Common fixes to try:',
    });
  }
}

function formatTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString();
}

function printTroubleshootingTips(task, options = {}) {
  const { indent = '   ', header = 'Troubleshooting tips:' } = options;
  const key = taskKey(task);
  const tips =
    troubleshootingTips[key] || troubleshootingTips[task.cmd] || troubleshootingTips[task.label];
  if (!tips || tips.length === 0) {
    return;
  }

  console.log(`${indent}💡 ${header}`);
  tips.forEach((tip) => {
    console.log(`${indent}   - ${tip}`);
  });
}
