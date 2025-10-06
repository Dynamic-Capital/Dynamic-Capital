#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createSanitizedNpmEnv } from "../utils/npm-env.mjs";

function shellQuote(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

const legacyHttpKeys = ["npm_config_http_proxy", "NPM_CONFIG_HTTP_PROXY"];
const canonicalKeys = [
  ["npm_config_proxy", "NPM_CONFIG_PROXY"],
  ["npm_config_https_proxy", "NPM_CONFIG_HTTPS_PROXY"],
];

const sanitized = createSanitizedNpmEnv();
const commands = [];

function readNpmConfig(key) {
  try {
    const result = spawnSync("npm", ["config", "get", key], {
      env: sanitized,
      encoding: "utf8",
    });

    if (result.status !== 0) {
      return undefined;
    }

    const value = result.stdout.trim();
    if (
      !value || value === "null" || value === "undefined" || value === "false"
    ) {
      return undefined;
    }

    return value;
  } catch {
    return undefined;
  }
}

for (const [lowerKey, upperKey] of canonicalKeys) {
  const value = sanitized[lowerKey];
  if (typeof value === "string") {
    if (process.env[lowerKey] !== value) {
      commands.push(`export ${lowerKey}=${shellQuote(value)}`);
    }
    if (process.env[upperKey] !== value) {
      commands.push(`export ${upperKey}=${shellQuote(value)}`);
    }
  }
}

for (const key of legacyHttpKeys) {
  if (key in process.env) {
    commands.push(`unset ${key}`);
  }
}

const legacyHttpProxyConfig = readNpmConfig("http-proxy");
if (legacyHttpProxyConfig) {
  commands.push("# Remove deprecated npm config entries");
  commands.push("npm config delete http-proxy");

  const proxyValue = sanitized.npm_config_proxy;
  if (typeof proxyValue === "string" && proxyValue.length > 0) {
    commands.push(`npm config set proxy ${shellQuote(proxyValue)}`);
  }

  const httpsProxyValue = sanitized.npm_config_https_proxy;
  if (typeof httpsProxyValue === "string" && httpsProxyValue.length > 0) {
    commands.push(`npm config set https-proxy ${shellQuote(httpsProxyValue)}`);
  }
}

if (commands.length === 0) {
  console.log("# No legacy npm proxy variables detected; nothing to update.");
} else {
  console.log("# Apply sanitized npm proxy environment settings");
  for (const command of commands) {
    console.log(command);
  }
}

if (process.stdout.isTTY) {
  console.error(
    'Tip: eval "$(node scripts/env/clean-legacy-npm-proxy.mjs)" to update this shell.',
  );
}
