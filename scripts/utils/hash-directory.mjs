import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

function joinPath(prefix, name) {
  return prefix ? `${prefix}/${name}` : name;
}

async function walkDirectory(root, relativePrefix, files, total) {
  const entries = await readdir(root, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    const relativePath = joinPath(relativePrefix, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(absolutePath, relativePath, files, total);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const data = await readFile(absolutePath);
    const fileHash = createHash("sha256").update(data).digest("hex");
    files.push({ path: relativePath, hash: fileHash, size: data.byteLength });
    total.bytes += data.byteLength;
  }
}

export async function hashDirectory(root) {
  let details;
  try {
    details = await stat(root);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  if (!details.isDirectory()) {
    throw new Error(
      `Expected a directory at ${root} to compute asset fingerprint.`,
    );
  }

  const files = [];
  const totals = { bytes: 0 };
  await walkDirectory(root, "", files, totals);

  files.sort((a, b) => a.path.localeCompare(b.path));

  const combined = createHash("sha256");
  for (const file of files) {
    combined.update(file.path);
    combined.update("\0");
    combined.update(file.hash);
  }

  const digest = combined.digest("hex");
  return {
    hash: digest,
    fileCount: files.length,
    totalBytes: totals.bytes,
    files,
  };
}
