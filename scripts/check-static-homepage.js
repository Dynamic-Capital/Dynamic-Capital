import fs from 'node:fs';
import path from 'node:path';

// This check previously enforced static rendering for the home page. The home
// page now intentionally uses `force-dynamic` to perform a server-side redirect
// during builds, so the check has been removed.

function hasTopLevelAwait(file) {
  const content = fs.readFileSync(file, 'utf8');
  return /^\s*await\s/m.test(content);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      if (hasTopLevelAwait(full)) {
        console.error(`Top-level await found in ${full}`);
        process.exit(1);
      }
    }
  }
}

walk('apps/web/config');
