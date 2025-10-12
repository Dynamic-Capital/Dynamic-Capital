import { type SourceResolver } from "@ton-community/func-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function createFuncSourceResolver(contractsRoot: string): SourceResolver {
  const resolvedPaths = new Map<string, string>();
  const searchDirectories = new Set<string>([contractsRoot]);

  return (requestedPath) => {
    const cachedPath = resolvedPaths.get(requestedPath);
    if (cachedPath && existsSync(cachedPath)) {
      return readFileSync(cachedPath, "utf8");
    }

    let resolvedPath: string | undefined;

    for (const directory of searchDirectories) {
      const candidatePath = resolve(directory, requestedPath);
      if (existsSync(candidatePath)) {
        resolvedPath = candidatePath;
        break;
      }
    }

    if (!resolvedPath) {
      throw new Error(`FunC source not found: ${requestedPath}`);
    }

    resolvedPaths.set(requestedPath, resolvedPath);
    searchDirectories.add(dirname(resolvedPath));

    return readFileSync(resolvedPath, "utf8");
  };
}
