// scripts/sync-env.ts
// Sync missing variables from .env.example into .env.local, preserving existing values.

const examplePath = ".env.example";
const localPath = ".env.local";

try {
  await Deno.stat(localPath);
} catch {
  await Deno.writeTextFile(localPath, "");
}

const exampleContent = await Deno.readTextFile(examplePath);
const localContent = await Deno.readTextFile(localPath);

const localKeys = new Set<string>();
for (const line of localContent.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (m) localKeys.add(m[1]);
}

const additions: string[] = [];
let buffer: string[] = [];
for (const line of exampleContent.split(/\r?\n/)) {
  if (/^\s*(#.*)?$/.test(line)) {
    buffer.push(line);
    continue;
  }
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (m) {
    const key = m[1];
    if (!localKeys.has(key)) {
      additions.push(...buffer, line);
    }
  }
  buffer = [];
}

if (additions.length > 0) {
  const prefix = localContent.endsWith("\n") || localContent.length === 0 ? "" : "\n";
  const newContent = localContent + prefix + additions.join("\n") + "\n";
  await Deno.writeTextFile(localPath, newContent);
  console.log("Appended", additions.filter((l) => !l.startsWith("#") && l).length, "variables to .env.local");
} else {
  console.log(".env.local is up to date");
}
