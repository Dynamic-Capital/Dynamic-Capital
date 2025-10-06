#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  applyBrandingEnvDefaults,
  PRODUCTION_ALLOWED_ORIGINS,
  PRODUCTION_ORIGIN,
} from "./utils/branding-env.mjs";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/npm-safe.mjs <npm arguments>");
  process.exit(1);
}

const {
  defaultedKeys,
  resolvedOrigin,
} = applyBrandingEnvDefaults({
  allowedOrigins: PRODUCTION_ALLOWED_ORIGINS,
  fallbackOrigin: PRODUCTION_ORIGIN,
});

if (defaultedKeys.length > 0) {
  console.warn(
    `npm-safe · Applied origin defaults (${
      defaultedKeys.join(", ")
    }) [${resolvedOrigin}]`,
  );
}

const env = createSanitizedNpmEnv();

const npmExecPath = env.npm_execpath ?? env.NPM_EXECPATH;
const npmNodeExecPath = env.npm_node_execpath ?? env.NPM_NODE_EXECPATH;

const shouldUseNodeWrapper = typeof npmExecPath === "string" &&
  npmExecPath.endsWith(".js");

const command = shouldUseNodeWrapper
  ? npmNodeExecPath ?? process.execPath
  : npmExecPath ?? "npm";
const commandArgs = shouldUseNodeWrapper ? [npmExecPath, ...args] : args;

const child = spawn(command, commandArgs, {
  stdio: "inherit",
  env,
});

const signalHandlers = new Map();
const terminationSignals = ["SIGINT", "SIGTERM", "SIGHUP"]; // cross-platform safe set

function registerSignalHandler(signal) {
  const record = { handler: null, timeout: undefined };
  const handler = () => {
    if (!child.killed) {
      child.kill(signal);
    }
    if (record.timeout) {
      return;
    }
    // Guarantee the parent eventually terminates even if the child ignores
    // the forwarded signal.
    const timeout = setTimeout(() => {
      process.exit(1);
    }, 1000);
    timeout.unref();
    record.timeout = timeout;
  };

  record.handler = handler;
  process.on(signal, handler);
  signalHandlers.set(signal, record);
}

for (const signal of terminationSignals) {
  registerSignalHandler(signal);
}

function cleanup() {
  for (const [signal, { handler, timeout }] of signalHandlers) {
    process.off(signal, handler);
    clearTimeout(timeout);
  }
  signalHandlers.clear();
}

child.on("exit", (code, signal) => {
  cleanup();
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  cleanup();
  console.error("Failed to launch npm:", error);
  process.exit(1);
});
