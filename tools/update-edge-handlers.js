import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve("supabase", "functions");

const toPosix = (p) => p.split(path.sep).join("/");

const computeRelativeImport = (filePath) => {
  const fileDir = path.dirname(filePath);
  const relative = path.relative(fileDir, path.join(root, "_shared", "serve.ts"));
  const normalized = toPosix(relative);
  if (!normalized.startsWith(".")) {
    return `./${normalized}`;
  }
  return normalized;
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const updateFile = async (filePath) => {
  let source = await fs.readFile(filePath, "utf8");
  const original = source;

  const relativeImport = computeRelativeImport(filePath);

  let requiresRegisterImport = false;
  source = source.replace(/import\s*\{\s*serve\s*\}\s*from\s*['"]https:\/\/deno\.land\/std@[^'"\n]+\/http\/server\.ts['"];?\s*\n?/g, () => {
    requiresRegisterImport = true;
    return "";
  });

  source = source.replace(
    /if\s*\(\s*import\.meta\.main[^)]*\)\s*\{([\s\S]*?)\}\s*/g,
    (match, body) => {
      const handlerMatch = body.match(/(?:Deno\.)?serve\s*\(\s*([A-Za-z0-9_]+)\s*\)/);
      if (!handlerMatch) return match;
      requiresRegisterImport = true;
      const handlerName = handlerMatch[1];
      return `registerHandler(${handlerName});\n`;
    },
  );

  source = source.replace(
    /if\s*\(\s*import\.meta\.main\s*\)\s*(?:await\s*)?(?:Deno\.)?serve\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*;?/g,
    (_match, handlerName) => {
      requiresRegisterImport = true;
      return `registerHandler(${handlerName});`;
    },
  );

  source = source.replace(
    /Deno\.serve\s*\(\s*([A-Za-z0-9_]+)\s*(?:,[^\)]*)?\)\s*;?/g,
    (_match, handlerName) => {
      requiresRegisterImport = true;
      return `registerHandler(${handlerName});`;
    },
  );

  source = source.replace(
    /(^|[^.\w])serve\s*\(\s*([A-Za-z0-9_]+)\s*(?:,[^\)]*)?\)\s*;?/g,
    (match, prefix, handlerName) => {
      const snippet = match.toString();
      if (/registerHandler\s*\(/.test(snippet)) {
        return match;
      }
      requiresRegisterImport = true;
      return `${prefix}registerHandler(${handlerName});`;
    },
  );

  const needsRegister = source.includes("registerHandler(");

  const registerImportRegex = new RegExp(
    `import\\s*\\{[^}]*registerHandler[^}]*\\}\\s*from\\s*['"]${escapeRegExp(relativeImport)}['"]`,
  );

  if (needsRegister && !registerImportRegex.test(source)) {
    const importStatement = `import { registerHandler } from "${relativeImport}";\n`;
    const importBlock = source.match(/^(?:import[^\n]*\n)+/);
    if (importBlock) {
      source = source.replace(importBlock[0], importBlock[0] + importStatement);
    } else {
      source = importStatement + source;
    }
  }

  if (!needsRegister && !requiresRegisterImport) {
    return false;
  }

  if (source === original) {
    return false;
  }

  await fs.writeFile(filePath, source);
  return true;
};

const main = async () => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const updated = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "_shared" || entry.name === "_tests") continue;
    const filePath = path.join(root, entry.name, "index.ts");
    if (!(await fileExists(filePath))) continue;
    const didUpdate = await updateFile(filePath);
    if (didUpdate) {
      updated.push(toPosix(path.relative(process.cwd(), filePath)));
    }
  }

  if (updated.length > 0) {
    console.log(`Updated edge handlers:\n${updated.join("\n")}`);
  } else {
    console.log("No edge handlers required updates.");
  }
};

await main();
