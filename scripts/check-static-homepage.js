import fs from "node:fs";
import path from "node:path";

const pageContent = fs.readFileSync("apps/web/app/page.tsx", "utf8");
if (/force-dynamic/.test(pageContent)) {
  console.warn("Homepage uses force-dynamic");
}

function hasTopLevelAwait(file) {
  const content = fs.readFileSync(file, "utf8");
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

walk("apps/web/config");
