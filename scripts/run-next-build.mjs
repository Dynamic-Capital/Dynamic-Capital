#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

process.env.NODE_ENV = 'production';

const cwd = process.cwd();

const child = spawn('next', ['build'], {
  cwd,
  env: { ...process.env },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderrBuffer = '';

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
});

child.stderr.on('data', (chunk) => {
  stderrBuffer += chunk.toString();
  process.stderr.write(chunk);
});

child.on('close', async (code) => {
  if (code === 0) {
    process.exit(0);
  }

  const pattern = /ENOENT: no such file or directory, copyfile '([^']*routes-manifest\.json)' -> '([^']*routes-manifest\.json)'/;
  const match = stderrBuffer.match(pattern);

  if (match) {
    const [, rawSrc, rawDest] = match;
    const src = path.isAbsolute(rawSrc) ? rawSrc : path.join(cwd, rawSrc);
    const dest = path.isAbsolute(rawDest) ? rawDest : path.join(cwd, rawDest);

    try {
      if (!existsSync(src)) {
        throw new Error(`source missing at ${src}`);
      }

      await mkdir(path.dirname(dest), { recursive: true });
      await copyFile(src, dest);
      console.warn('⚠️  Patched missing routes-manifest.json for Next.js standalone output.');
      process.exit(0);
    } catch (err) {
      console.error('Failed to recover from Next.js routes-manifest copy error:', err);
    }
  }

  process.exit(code ?? 1);
});
