#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HTTP_PROXY_SOURCE_KEYS = [
  "npm_config_http_proxy",
  "NPM_CONFIG_HTTP_PROXY",
];
const PROXY_CANONICAL_KEYS = [
  "npm_config_proxy",
  "NPM_CONFIG_PROXY",
];
const HTTPS_PROXY_CANONICAL_KEYS = [
  "npm_config_https_proxy",
  "NPM_CONFIG_HTTPS_PROXY",
];

function coerceValue(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

function assignCanonicalPair(env, lowerKey, upperKey, value) {
  if (value === undefined) {
    return;
  }
  env[lowerKey] = value;
  env[upperKey] = value;
}

const CA_BUNDLE_PATH = (() => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = dirname(currentDir);
  const candidate = join(repoRoot, "certs", "mozilla-root-ca.pem");
  return existsSync(candidate) ? candidate : null;
})();

export function createSanitizedNpmEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };

  const httpProxy = coerceValue(env, HTTP_PROXY_SOURCE_KEYS);
  const existingProxy = coerceValue(env, PROXY_CANONICAL_KEYS);
  const existingHttpsProxy = coerceValue(env, HTTPS_PROXY_CANONICAL_KEYS);

  const canonicalProxy = existingProxy ?? httpProxy ?? existingHttpsProxy;
  const canonicalHttpsProxy = existingHttpsProxy ?? canonicalProxy ?? httpProxy;

  assignCanonicalPair(
    env,
    PROXY_CANONICAL_KEYS[0],
    PROXY_CANONICAL_KEYS[1],
    canonicalProxy,
  );
  assignCanonicalPair(
    env,
    HTTPS_PROXY_CANONICAL_KEYS[0],
    HTTPS_PROXY_CANONICAL_KEYS[1],
    canonicalHttpsProxy,
  );

  for (const key of HTTP_PROXY_SOURCE_KEYS) {
    if (key in env) {
      delete env[key];
    }
  }

  if (CA_BUNDLE_PATH) {
    const hasUsableNodeExtra = typeof env.NODE_EXTRA_CA_CERTS === "string" &&
      existsSync(env.NODE_EXTRA_CA_CERTS);
    if (!hasUsableNodeExtra) {
      env.NODE_EXTRA_CA_CERTS = CA_BUNDLE_PATH;
    }

    const hasUsableExtra = typeof env.EXTRA_CA_CERT === "string" &&
      existsSync(env.EXTRA_CA_CERT);
    if (!hasUsableExtra) {
      env.EXTRA_CA_CERT = CA_BUNDLE_PATH;
    }

    const hasUsableSslFile = typeof env.SSL_CERT_FILE === "string" &&
      existsSync(env.SSL_CERT_FILE);
    if (!hasUsableSslFile) {
      env.SSL_CERT_FILE = CA_BUNDLE_PATH;
    }
  }

  return env;
}
