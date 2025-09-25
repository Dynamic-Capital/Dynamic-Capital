#!/usr/bin/env node

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

  return env;
}
