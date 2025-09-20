#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createSanitizedNpmEnv } from './utils/npm-env.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const { env: providedEnv, ...rest } = options;
  const env = createSanitizedNpmEnv(providedEnv ?? {});
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...rest,
      env,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

function isMissing(value) {
  if (!value) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}

async function main() {
  console.log('DigitalOcean build: running `npm run build`…');
  const buildCode = await run(npmCommand, ['run', 'build']);
  if (buildCode !== 0) {
    console.error('DigitalOcean build: `npm run build` failed. Aborting.');
    process.exit(buildCode);
  }

  const requiredKeys = ['CDN_BUCKET', 'CDN_ACCESS_KEY', 'CDN_SECRET_KEY'];
  const missingKeys = requiredKeys.filter((key) => isMissing(process.env[key]));

  if (missingKeys.length > 0) {
    console.warn(
      `DigitalOcean build: skipping static asset upload because credentials are missing (${missingKeys.join(', ')}).`,
    );
    console.warn('Set CDN_BUCKET, CDN_ACCESS_KEY, and CDN_SECRET_KEY to enable uploads during the build.');
    return;
  }

  console.log('DigitalOcean build: uploading `_static/` assets to Spaces…');
  const uploadCode = await run(npmCommand, ['run', 'upload-assets']);
  if (uploadCode !== 0) {
    console.error('DigitalOcean build: `npm run upload-assets` failed.');
    process.exit(uploadCode);
  }

  console.log('DigitalOcean build: static asset upload completed successfully.');
}

main().catch((error) => {
  console.error('DigitalOcean build: unexpected error while preparing deployment:', error);
  process.exit(1);
});
