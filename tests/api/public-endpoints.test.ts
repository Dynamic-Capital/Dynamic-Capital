import test from "node:test";
import assert from "node:assert/strict";

import { PUBLIC_API_ENDPOINTS } from "../../apps/web/data/api-endpoints.ts";

const MODULE_PATHS: Record<string, string> = {
  "/api/dynamic-rest": "../../apps/web/app/api/dynamic-rest/route.ts",
  "/api/dynamic-rest/resources/:slug":
    "../../apps/web/app/api/dynamic-rest/resources/[resource]/route.ts",
  "/api/dex-screener": "../../apps/web/app/api/dex-screener/route.ts",
  "/api/dynamic-ai/chat": "../../apps/web/app/api/dynamic-ai/chat/route.ts",
  "/api/dynamic-ai/voice-to-text":
    "../../apps/web/app/api/dynamic-ai/voice-to-text/route.ts",
  "/api/tonconnect/manifest":
    "../../apps/web/app/api/tonconnect/manifest/route.ts",
};

function toFileUrl(relativePath: string): URL {
  return new URL(relativePath, import.meta.url);
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

test("public API endpoints reference live route handlers", async () => {
  const seenPaths = new Set<string>();

  for (const endpoint of PUBLIC_API_ENDPOINTS) {
    assert.equal(
      endpoint.method,
      endpoint.method.toUpperCase(),
      `method should be uppercase: ${endpoint.method}`,
    );
    assert.ok(
      endpoint.path.startsWith("/api/"),
      `endpoint path should begin with /api: ${endpoint.path}`,
    );
    assert.ok(
      endpoint.description.trim().length > 0,
      `endpoint description missing for ${endpoint.path}`,
    );
    assert.ok(
      !seenPaths.has(endpoint.path),
      `duplicate endpoint path detected: ${endpoint.path}`,
    );
    seenPaths.add(endpoint.path);

    const modulePath = MODULE_PATHS[endpoint.path];
    assert.ok(modulePath, `no module mapping defined for ${endpoint.path}`);

    const fileUrl = toFileUrl(modulePath);
    await Deno.stat(fileUrl);
    const source = await Deno.readTextFile(fileUrl);

    assert.ok(
      hasExportedHandler(source, endpoint.method),
      `expected ${endpoint.method} export in ${modulePath}`,
    );
  }
});
