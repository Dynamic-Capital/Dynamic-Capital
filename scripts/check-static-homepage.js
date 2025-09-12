import fs from 'node:fs';

const content = fs.readFileSync('apps/web/app/page.tsx', 'utf8');
if (/force-dynamic/.test(content) || /^\s*await\s/m.test(content)) {
  console.error('Homepage must not use force-dynamic or top-level await');
  process.exit(1);
}
