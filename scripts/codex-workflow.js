#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
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

const hasNodeModules = existsSync(path.join(repoRoot, 'node_modules'));

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
if (dryRun) {
  console.log('🔎 Dry run enabled. Listing planned steps without executing them:');
  tasks.forEach((task, idx) => {
    console.log(` ${idx + 1}. ${task.label}${task.optional ? ' (optional)' : ''}`);
  });
  process.exit(0);
}

runTasks(tasks);
console.log('\n🎉 Codex workflow tasks completed.');

function command(label, cmd, options = {}) {
  const { optional = false, skip = false } = options;
  if (skip) return null;
  return { label, cmd, optional };
}

function runTasks(taskList) {
  taskList.forEach((task, index) => {
    const step = index + 1;
    console.log(`\n➡️  Step ${step}/${taskList.length}: ${task.label}`);
    try {
      execSync(task.cmd, { stdio: 'inherit', shell: true });
      console.log(`✅ ${task.label}`);
    } catch (error) {
      if (task.optional) {
        console.warn(`⚠️  ${task.label} failed (optional).`, error?.message ?? '');
      } else {
        console.error(`❌ ${task.label} failed.`);
        if (error?.status) {
          process.exit(error.status);
        }
        process.exit(1);
      }
    }
  });
}

function printUsage() {
  console.log(`Codex CLI workflow helper\n\nUsage: node scripts/codex-workflow.js [mode] [flags]\n\nModes:\n  post-pull (default)  Prepare the repo after pulling from Codex CLI.\n  dev                  Sync env and start Lovable dev server.\n  build                Run env checks and Lovable build.\n  verify               Run the verification suite.\n\nFlags:\n  --no-install         Skip \`npm install\` (post-pull).\n  --no-sync            Skip \`npm run sync-env\`.\n  --no-env-check       Skip env validation (not recommended).\n  --no-build           Skip Lovable build (post-pull/build).\n  --build-optional     Treat Lovable build failures as warnings.\n  --verify             Run \`npm run verify\` after post-pull steps.\n  --no-verify          Skip verify step even if --verify provided.\n  --dry-run            Show planned steps without executing.\n  --help, -h           Show this message.\n`);
}
