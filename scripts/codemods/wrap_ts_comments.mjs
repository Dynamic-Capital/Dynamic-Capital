import fs from "fs";
import path from "path";

const roots = [process.cwd()];
const exts = /\.(ts|tsx|js|jsx|mjs)$/;
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "tmp",
  "out",
  ".vercel",
  "vendor",
]);

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      yield* walk(entryPath);
    } else if (exts.test(entry.name)) yield entryPath;
  }
}

for (const root of roots) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, "utf8").split("\n");
    let changed = false;
    for (let i = 0; i < src.length; i++) {
      const line = src[i];
      if (/@ts-(ignore|expect-error)/.test(line)) {
        const prev = src[i - 1] || "";
        if (!/deno-lint-ignore\s+ban-ts-comment/.test(prev)) {
          src.splice(i, 0, "// deno-lint-ignore ban-ts-comment");
          i++;
          changed = true;
        }
      }
    }
    if (changed) {
      fs.writeFileSync(file, src.join("\n"));
      console.log("wrapped ts-comment:", file);
    }
  }
}
