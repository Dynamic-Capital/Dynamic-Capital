import assert from "node:assert/strict";
import { resolveBrandingOrigin } from "../../scripts/utils/branding-env.mjs";

Deno.test("resolveBrandingOrigin normalizes bare host hints", () => {
  const env = { PRIMARY_HOST: "example.com" };
  const result = resolveBrandingOrigin({
    env,
    fallbackOrigin: "https://fallback.test",
  });

  assert.equal(result.originSource, "PRIMARY_HOST");
  assert.equal(result.resolvedOrigin, "https://example.com");
});

Deno.test("resolveBrandingOrigin accepts host hints with protocols", () => {
  const env = { PRIMARY_HOST: "https://sample.dynamic.app" };
  const result = resolveBrandingOrigin({
    env,
    fallbackOrigin: "https://fallback.test",
  });

  assert.equal(result.originSource, "PRIMARY_HOST");
  assert.equal(result.resolvedOrigin, "https://sample.dynamic.app");
});
