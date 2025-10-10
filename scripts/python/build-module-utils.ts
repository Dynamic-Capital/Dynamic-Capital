import { access, readdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join, relative, resolve } from "node:path";

const DIRECTORY_EXCLUSIONS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "__pycache__",
  "dist",
  "build",
  "dynamic_build_stub",
]);

function shouldSkipDirectory(name: string): boolean {
  if (DIRECTORY_EXCLUSIONS.has(name)) {
    return true;
  }

  if (name.startsWith(".")) {
    return true;
  }

  return false;
}

export interface PackageInfo {
  name: string;
  path: string;
}

export interface PackageReport {
  name: string;
  path: string;
  expected: string[];
}

export const DEFAULT_PREFIX = "dynamic_";

export const DEFAULT_EXPECTED_MODULES = [
  "build.py",
  join("build", "__init__.py"),
];

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function listCandidatePackages(
  root: string,
  prefix: string,
): Promise<PackageInfo[]> {
  const absoluteRoot = resolve(root);
  const candidates: PackageInfo[] = [];
  const visited = new Set<string>();

  async function traverse(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      const resolvedPath = join(currentPath, entry.name);
      if (visited.has(resolvedPath)) {
        continue;
      }
      visited.add(resolvedPath);

      if (entry.name.startsWith(prefix)) {
        const initPath = join(resolvedPath, "__init__.py");
        if (await pathExists(initPath)) {
          candidates.push({ name: entry.name, path: resolvedPath });
          // Continue walking to catch nested packages if they exist.
        }
      }

      await traverse(resolvedPath);
    }
  }

  await traverse(absoluteRoot);

  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

export async function findMissingBuildModules(
  packages: PackageInfo[],
  root: string,
): Promise<PackageReport[]> {
  const reports: PackageReport[] = [];

  await Promise.all(
    packages.map(async (pkg) => {
      const hasModule = await Promise.all(
        DEFAULT_EXPECTED_MODULES.map((relativePath) =>
          pathExists(join(pkg.path, relativePath))
        ),
      ).then((results) => results.some(Boolean));

      if (!hasModule) {
        const packageRelativePath = relative(root, pkg.path);
        reports.push({
          name: pkg.name,
          path: packageRelativePath,
          expected: DEFAULT_EXPECTED_MODULES.map((relativePath) =>
            join(packageRelativePath, relativePath)
          ),
        });
      }
    }),
  );

  return reports.sort((a, b) => a.name.localeCompare(b.name));
}
