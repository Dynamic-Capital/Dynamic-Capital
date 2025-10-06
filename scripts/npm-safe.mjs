#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/npm-safe.mjs <npm arguments>");
  process.exit(1);
}

const env = createSanitizedNpmEnv();

function resolveExecPath(candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return undefined;
  }

  if (path.isAbsolute(candidate) && existsSync(candidate)) {
    return candidate;
  }

  const searchRoots = [
    env.PWD,
    process.cwd(),
    path.dirname(process.execPath),
  ].filter(Boolean);

  for (const root of searchRoots) {
    const resolved = path.resolve(root, candidate);
    if (existsSync(resolved)) {
      return resolved;
    }
  }

  return candidate;
}

function coerceLifecycleEvent(npmArgs) {
  const runIndex = npmArgs.findIndex((arg) =>
    arg === "run" || arg === "run-script"
  );
  if (runIndex === -1) {
    return undefined;
  }

  const scriptName = npmArgs[runIndex + 1];
  return typeof scriptName === "string" ? scriptName : undefined;
}

const lifecycleEvent = coerceLifecycleEvent(args);
if (
  lifecycleEvent && lifecycleEvent.startsWith("build") &&
  (env.NODE_ENV === undefined || env.NODE_ENV === "")
) {
  env.NODE_ENV = "production";
}

const rawNpmExecPath = env.npm_execpath ?? env.NPM_EXECPATH;
const rawNodeExecPath = env.npm_node_execpath ?? env.NPM_NODE_EXECPATH;

const npmExecPath = resolveExecPath(rawNpmExecPath);
const npmNodeExecPath = resolveExecPath(rawNodeExecPath);

const execPathForCheck = typeof npmExecPath === "string"
  ? npmExecPath
  : (typeof rawNpmExecPath === "string" ? rawNpmExecPath : undefined);

const executableExtension = typeof execPathForCheck === "string"
  ? path.extname(execPathForCheck).toLowerCase()
  : "";

const shouldUseNodeWrapper = [".js", ".mjs", ".cjs"].includes(
  executableExtension,
);

let command;
let commandArgs;

if (shouldUseNodeWrapper && typeof execPathForCheck === "string") {
  const nodeExecutable = npmNodeExecPath ?? process.execPath;
  command = nodeExecutable;
  commandArgs = [
    resolveExecPath(execPathForCheck) ?? execPathForCheck,
    ...args,
  ];
} else {
  const fallbackCommand = typeof npmExecPath === "string"
    ? npmExecPath
    : (typeof rawNpmExecPath === "string" ? rawNpmExecPath : undefined);
  command = fallbackCommand ?? "npm";
  commandArgs = args;
}

if (typeof command !== "string" || command.length === 0) {
  console.error("Unable to determine npm executable. Ensure npm is installed.");
  process.exit(1);
}

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
