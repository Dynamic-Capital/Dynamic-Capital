#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const requirementsPath = resolve(__dirname, '../dynamic_crawlers/requirements-github.txt');

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', (error) => {
      rejectPromise(error);
    });
  });
}

async function installFromGitSubdir(repoUrl, subdir) {
  const tempDir = mkdtempSync(join(tmpdir(), 'crawler-install-'));
  try {
    await runCommand('git', ['clone', '--depth', '1', repoUrl, tempDir]);
    const installTarget = subdir ? resolve(tempDir, subdir) : tempDir;
    await runCommand('npm', ['install', '--no-save', installTarget]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const steps = [
  {
    label: 'Python crawler dependencies',
    action: () =>
      runCommand('python', [
        '-m',
        'pip',
        'install',
        '--upgrade',
        '--disable-pip-version-check',
        '-r',
        requirementsPath,
      ]),
  },
  {
    label: 'LLM Scraper (Node)',
    action: () =>
      runCommand('npm', [
        'install',
        '--no-save',
        'git+https://github.com/mishushakov/llm-scraper.git',
      ]),
  },
  {
    label: 'Crawlee toolkit (Node)',
    action: () => installFromGitSubdir('https://github.com/apify/crawlee.git', 'packages/crawlee'),
  },
  {
    label: 'Firecrawl JS SDK (Node)',
    action: () => installFromGitSubdir('https://github.com/firecrawl/firecrawl.git', 'apps/js-sdk'),
  },
];

(async () => {
  for (const step of steps) {
    console.log(`\n• ${step.label}`);
    await step.action();
  }
  console.log('\nAll crawler dependencies installed successfully.');
})().catch((error) => {
  console.error(`\nCrawler installation failed: ${error.message}`);
  process.exit(1);
});
