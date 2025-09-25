#!/usr/bin/env node
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
