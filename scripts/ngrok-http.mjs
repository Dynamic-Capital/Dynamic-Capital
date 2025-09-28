#!/usr/bin/env node
import { spawn } from "node:child_process";

const DEFAULT_PORT = process.env.NGROK_PORT ?? "54321";
const DEFAULT_BIN = process.env.NGROK_BIN ?? "ngrok";

const rawArgs = process.argv.slice(2);
let port = DEFAULT_PORT;
let dryRun = false;
let bin = DEFAULT_BIN;
const forwardedArgs = [];

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === "--port") {
    const next = rawArgs[i + 1];
    if (!next) {
      console.error("Expected a value after --port");
      process.exit(1);
    }
    port = next;
    i += 1;
    continue;
  }

  if (arg.startsWith("--port=")) {
    port = arg.slice("--port=".length);
    continue;
  }

  if (arg === "--dry-run") {
    dryRun = true;
    continue;
  }

  if (arg === "--bin") {
    const next = rawArgs[i + 1];
    if (!next) {
      console.error("Expected a value after --bin");
      process.exit(1);
    }
    bin = next;
    i += 1;
    continue;
  }

  if (arg.startsWith("--bin=")) {
    bin = arg.slice("--bin=".length);
    continue;
  }

  forwardedArgs.push(arg);
}

const ngrokArgs = ["http", port, ...forwardedArgs];

if (dryRun) {
  console.log(
    JSON.stringify({
      bin,
      args: ngrokArgs,
    }),
  );
  process.exit(0);
}

const child = spawn(bin, ngrokArgs, {
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to launch ngrok CLI:", error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
