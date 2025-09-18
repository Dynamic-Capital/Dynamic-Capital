// scripts/sync-env.ts
// Sync missing variables from .env.example into .env and .env.local, preserving existing values.

const examplePath = ".env.example";
const targetPaths = [".env", ".env.local"];

const exampleContent = await Deno.readTextFile(examplePath);

async function ensureFile(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    await Deno.writeTextFile(path, "");
    return false;
  }
}

function parseKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function computeAdditions(
  example: string,
  existingKeys: Set<string>,
): string[] {
  const additions: string[] = [];
  let buffer: string[] = [];
  for (const line of example.split(/\r?\n/)) {
    if (/^\s*(#.*)?$/.test(line)) {
      buffer.push(line);
      continue;
    }
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) {
      const key = m[1];
      if (!existingKeys.has(key)) {
        additions.push(...buffer, line);
      }
    }
    buffer = [];
  }
  return additions;
}

for (const target of targetPaths) {
  const existed = await ensureFile(target);
  const currentContent = await Deno.readTextFile(target);
  const keys = parseKeys(currentContent);
  const additions = computeAdditions(exampleContent, keys);
  if (additions.length > 0) {
    const prefix = currentContent.endsWith("\n") || currentContent.length === 0
      ? ""
      : "\n";
    const newContent = currentContent + prefix + additions.join("\n") + "\n";
    await Deno.writeTextFile(target, newContent);
    const appendedCount = additions.filter((line) => {
      const trimmed = line.trim();
      return trimmed !== "" && !trimmed.startsWith("#");
    }).length;
    console.log("Appended", appendedCount, `variables to ${target}`);
  } else {
    console.log(`${target} is up to date${existed ? "" : " (created)"}`);
  }
}
