import { access, readdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join, relative, resolve } from "node:path";

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
  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  const candidates: PackageInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!entry.name.startsWith(prefix)) {
      continue;
    }

    const packagePath = join(absoluteRoot, entry.name);
    if (!(await pathExists(join(packagePath, "__init__.py")))) {
      continue;
    }

    candidates.push({ name: entry.name, path: packagePath });
  }

  return candidates;
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
