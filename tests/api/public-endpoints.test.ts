import { assert, assertEquals } from "jsr:@std/assert";

import { PUBLIC_API_ENDPOINTS } from "../../apps/web/data/api-endpoints.ts";

const API_ROUTES_DIRECTORY = new URL(
  "../../apps/web/app/api/",
  import.meta.url,
);

async function pathExists(url: URL): Promise<boolean> {
  try {
    await Deno.stat(url);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

async function findDynamicRouteDirectory(parent: URL): Promise<string | null> {
  for await (const entry of Deno.readDir(parent)) {
    if (
      entry.isDirectory && entry.name.startsWith("[") && entry.name.endsWith("]")
    ) {
      return entry.name;
    }
  }
  return null;
}

async function resolveRouteModuleUrl(endpointPath: string): Promise<URL> {
  if (!endpointPath.startsWith("/api/")) {
    throw new Error(`public endpoint path must start with /api: ${endpointPath}`);
  }

  const routeSegments = endpointPath.replace(/^\/api\//u, "").split("/");
  let currentUrl = API_ROUTES_DIRECTORY;

  for (const segment of routeSegments) {
    if (!segment) {
      continue;
    }

    const candidate = new URL(`${segment}/`, currentUrl);
    if (await pathExists(candidate)) {
      currentUrl = candidate;
      continue;
    }

    const dynamicDirectory = await findDynamicRouteDirectory(currentUrl);
    if (dynamicDirectory) {
      currentUrl = new URL(`${dynamicDirectory}/`, currentUrl);
      continue;
    }

    throw new Error(
      `Unable to resolve module directory for ${endpointPath} at segment "${segment}"`,
    );
  }

  const routeModule = new URL("route.ts", currentUrl);
  if (!(await pathExists(routeModule))) {
    throw new Error(`Route module not found for ${endpointPath}: ${routeModule}`);
  }

  return routeModule;
}

function hasExportedHandler(source: string, method: string): boolean {
  const functionPattern = new RegExp(
    `export\\s+(?:async\\s+)?function\\s+${method}\\b`,
  );
  if (functionPattern.test(source)) {
    return true;
  }

  const constPattern = new RegExp(`export\\s+const\\s+${method}\\s*=`);
  return constPattern.test(source);
}

Deno.test("public API endpoints reference live route handlers", async () => {
  const seenPaths = new Set<string>();

  for (const endpoint of PUBLIC_API_ENDPOINTS) {
    assertEquals(
      endpoint.method,
      endpoint.method.toUpperCase(),
      `method should be uppercase: ${endpoint.method}`,
    );
    assert(
      endpoint.path.startsWith("/api/"),
      `endpoint path should begin with /api: ${endpoint.path}`,
    );
    assert(
      endpoint.description.trim().length > 0,
      `endpoint description missing for ${endpoint.path}`,
    );
    assert(
      !seenPaths.has(endpoint.path),
      `duplicate endpoint path detected: ${endpoint.path}`,
    );
    seenPaths.add(endpoint.path);

    const moduleUrl = await resolveRouteModuleUrl(endpoint.path);
    const source = await Deno.readTextFile(moduleUrl);

    assert(
      hasExportedHandler(source, endpoint.method),
      `expected ${endpoint.method} export in ${moduleUrl.pathname}`,
    );
  }
});
