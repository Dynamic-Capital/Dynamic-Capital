#!/usr/bin/env node
import { spawn } from "node:child_process";

const DEFAULT_PORT = process.env.NGROK_PORT ?? "54321";

const rawArgs = process.argv.slice(2);
let port = DEFAULT_PORT;
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

  forwardedArgs.push(arg);
}

const ngrokArgs = ["http", port, ...forwardedArgs];

const child = spawn("ngrok", ngrokArgs, {
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
