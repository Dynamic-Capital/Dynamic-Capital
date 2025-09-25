import test from "node:test";
import { equal as assertEqual, ok as assertOk } from "node:assert/strict";
import { createSanitizedNpmEnv } from "../scripts/utils/npm-env.mjs";

async function withEnv(tempEnv, run) {
  const originalValues = new Map();
  const keys = Object.keys(tempEnv);

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(process.env, key)) {
      originalValues.set(key, process.env[key]);
    } else {
      originalValues.set(key, undefined);
    }

    const value = tempEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await run();
  } finally {
    for (const [key, value] of originalValues.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("maps deprecated http proxy vars to canonical keys", async () => {
  await withEnv(
    {
      npm_config_http_proxy: "http://legacy-proxy.test",
      NPM_CONFIG_HTTP_PROXY: undefined,
      npm_config_proxy: undefined,
      NPM_CONFIG_PROXY: undefined,
      npm_config_https_proxy: undefined,
      NPM_CONFIG_HTTPS_PROXY: undefined,
    },
    async () => {
      const sanitized = createSanitizedNpmEnv();

      assertEqual(sanitized.npm_config_proxy, "http://legacy-proxy.test");
      assertEqual(sanitized.NPM_CONFIG_PROXY, "http://legacy-proxy.test");
      assertEqual(sanitized.npm_config_https_proxy, "http://legacy-proxy.test");
      assertEqual(
        sanitized.NPM_CONFIG_HTTPS_PROXY,
        "http://legacy-proxy.test",
      );
      assertOk(!("npm_config_http_proxy" in sanitized));
      assertOk(!("NPM_CONFIG_HTTP_PROXY" in sanitized));
    },
  );
});

test("preserves explicit https proxy value", async () => {
  await withEnv(
    {
      npm_config_http_proxy: "http://legacy-http.test",
      npm_config_https_proxy: "https://secure-proxy.test",
      npm_config_proxy: undefined,
      NPM_CONFIG_PROXY: undefined,
      NPM_CONFIG_HTTPS_PROXY: undefined,
    },
    async () => {
      const sanitized = createSanitizedNpmEnv();

      assertEqual(sanitized.npm_config_proxy, "http://legacy-http.test");
      assertEqual(sanitized.NPM_CONFIG_PROXY, "http://legacy-http.test");
      assertEqual(
        sanitized.npm_config_https_proxy,
        "https://secure-proxy.test",
      );
      assertEqual(
        sanitized.NPM_CONFIG_HTTPS_PROXY,
        "https://secure-proxy.test",
      );
    },
  );
});

test("allows overrides to control canonical proxy values", async () => {
  await withEnv(
    {
      npm_config_http_proxy: "http://legacy-only.test",
      npm_config_proxy: undefined,
      NPM_CONFIG_PROXY: undefined,
      npm_config_https_proxy: undefined,
      NPM_CONFIG_HTTPS_PROXY: undefined,
    },
    async () => {
      const sanitized = createSanitizedNpmEnv({
        npm_config_proxy: "http://override-proxy.test",
      });

      assertEqual(sanitized.npm_config_proxy, "http://override-proxy.test");
      assertEqual(sanitized.NPM_CONFIG_PROXY, "http://override-proxy.test");
      assertEqual(
        sanitized.npm_config_https_proxy,
        "http://override-proxy.test",
      );
      assertEqual(
        sanitized.NPM_CONFIG_HTTPS_PROXY,
        "http://override-proxy.test",
      );
    },
  );
});
