#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { ensureDir, pathExists, readFile, readdir, stat, writeFile } from 'fs-extra';
import { getAllMappings } from './index.js';

interface CliOptions {
  dryRun: boolean;
  backup: boolean;
  silent: boolean;
}

interface ReplacementResult {
  readonly filePath: string;
  readonly replacements: number;
}

const DEFAULT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yaml',
  '.yml',
  '.md',
]);

async function collectFiles(targetPath: string): Promise<string[]> {
  const stats = await stat(targetPath);
  if (stats.isDirectory()) {
    const directoryName = path.basename(targetPath);
    if (directoryName === 'node_modules' || directoryName === '.git') {
      return [];
    }

    const entries = await readdir(targetPath);
    const nested = await Promise.all(
      entries.map((entry: string) => collectFiles(path.join(targetPath, entry))),
    );
    return nested.flat();
  }

  if (!DEFAULT_EXTENSIONS.has(path.extname(targetPath))) {
    return [];
  }

  return [targetPath];
}

function parseArgs(rawArgs: readonly string[]): { targets: string[]; options: CliOptions } {
  const targets: string[] = [];
  const options: CliOptions = { dryRun: false, backup: false, silent: false };

  for (const arg of rawArgs) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--backup') {
      options.backup = true;
    } else if (arg === '--silent') {
      options.silent = true;
    } else {
      targets.push(arg);
    }
  }

  return { targets, options };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function backupFile(filePath: string): Promise<void> {
  const directory = path.dirname(filePath);
  const filename = path.basename(filePath);
  const backupDir = path.join(directory, '.naming-engine');
  await ensureDir(backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${filename}.${timestamp}.bak`);
  const content = await readFile(filePath, 'utf8');
  await writeFile(backupPath, content, 'utf8');
}

async function replaceInFile(filePath: string, options: CliOptions): Promise<ReplacementResult | null> {
  const originalContent = await readFile(filePath, 'utf8');
  let mutatedContent = originalContent;
  let replacements = 0;

  for (const { short, full } of getAllMappings()) {
    const regex = new RegExp(`\\b${escapeRegex(full)}\\b`, 'g');
    mutatedContent = mutatedContent.replace(regex, () => {
      replacements += 1;
      return short;
    });
  }

  if (replacements === 0) {
    return null;
  }

  if (!options.dryRun) {
    if (options.backup) {
      await backupFile(filePath);
    }

    await writeFile(filePath, mutatedContent, 'utf8');
  }

  return { filePath, replacements };
}

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  const { targets, options } = parseArgs(argv);

  if (targets.length === 0) {
    console.error('Please provide at least one file or directory to process.');
    process.exitCode = 1;
    return;
  }

  const resolvedTargets = await Promise.all(targets.map(async (target) => {
    const resolved = path.resolve(target);
    if (!(await pathExists(resolved))) {
      throw new Error(`Target does not exist: ${target}`);
    }
    return resolved;
  }));

  const files = (
    await Promise.all(resolvedTargets.map((target) => collectFiles(target)))
  ).flat();

  if (files.length === 0) {
    if (!options.silent) {
      console.log('No files matched the provided targets.');
    }
    return;
  }

  const results = await Promise.all(
    files.map(async (file) => replaceInFile(file, options)),
  );

  const successful = results.filter((result): result is ReplacementResult => result !== null);

  if (successful.length === 0) {
    if (!options.silent) {
      console.log('No replacements were necessary.');
    }
    return;
  }

  const total = successful.reduce((sum, { replacements }) => sum + replacements, 0);
  if (!options.silent) {
    for (const { filePath, replacements } of successful) {
      console.log(`✅ ${options.dryRun ? 'Would replace' : 'Replaced'} ${replacements} entr${replacements === 1 ? 'y' : 'ies'} in ${pathToFileURL(filePath).href}`);
    }
    console.log(`ℹ️  ${options.dryRun ? 'Identified' : 'Completed'} ${total} total replacement${total === 1 ? '' : 's'} across ${successful.length} file${successful.length === 1 ? '' : 's'}.`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
