#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const helperPath = resolve(scriptDir, "ngrok-http.mjs");

function parseCliArgs(args) {
  const forwardedFlags = [];
  let expectedPort = process.env.NGROK_PORT ?? "54321";
  let expectedBin = process.env.NGROK_BIN ?? "ngrok";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--port") {
      const next = args[i + 1];
      if (!next) {
        throw new Error("Missing value after --port");
      }
      expectedPort = next;
      i += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      expectedPort = arg.slice("--port=".length);
      continue;
    }

    if (arg === "--bin") {
      const next = args[i + 1];
      if (!next) {
        throw new Error("Missing value after --bin");
      }
      expectedBin = next;
      i += 1;
      continue;
    }

    if (arg.startsWith("--bin=")) {
      expectedBin = arg.slice("--bin=".length);
      continue;
    }

    forwardedFlags.push(arg);
  }

  return { expectedPort, expectedBin, forwardedFlags };
}

const cliArgs = process.argv.slice(2);
let expected;
try {
  expected = parseCliArgs(cliArgs);
} catch (error) {
  console.error(`❌  ${error.message}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [
  helperPath,
  "--dry-run",
  ...cliArgs,
], {
  encoding: "utf8",
});

if (result.error) {
  console.error(
    "❌  Failed to execute ngrok helper dry-run:",
    result.error.message,
  );
  process.exit(1);
}

if (typeof result.status === "number" && result.status !== 0) {
  if (result.stdout.trim()) {
    console.error(result.stdout.trim());
  }
  if (result.stderr.trim()) {
    console.error(result.stderr.trim());
  }
  console.error(`❌  ngrok helper exited with status ${result.status}.`);
  process.exit(result.status || 1);
}

let payload;
try {
  payload = JSON.parse(result.stdout.trim());
} catch (error) {
  console.error("❌  Unable to parse ngrok helper output as JSON.");
  if (result.stdout.trim()) {
    console.error(result.stdout.trim());
  }
  process.exit(1);
}

const args = Array.isArray(payload.args) ? payload.args : [];
const [mode, port] = args;
const forwarded = args.slice(2);
const issues = [];

if (mode !== "http") {
  issues.push(`Expected first argument to be \"http\", received \"${mode}\".`);
}

if (!port) {
  issues.push("Missing tunnel port in dry-run output.");
} else if (port !== expected.expectedPort) {
  issues.push(`Expected port ${expected.expectedPort}, received ${port}.`);
}

if (payload.bin !== expected.expectedBin) {
  issues.push(
    `Expected binary ${expected.expectedBin}, received ${
      payload.bin || "<empty>"
    }.`,
  );
}

const missingFlags = expected.forwardedFlags.filter((flag) =>
  !forwarded.includes(flag)
);
if (missingFlags.length > 0) {
  issues.push(`Missing forwarded flags: ${missingFlags.join(", ")}.`);
}

if (issues.length > 0) {
  console.error("❌  Tunnel smoke test failed:");
  issues.forEach((issue) => console.error(`   - ${issue}`));
  process.exit(1);
}

console.log("✅  ngrok tunnel helper dry-run looks good.");
console.log(`    Binary: ${payload.bin}`);
console.log(`    Command: ${[payload.bin, ...args].join(" ")}`);
if (forwarded.length > 0) {
  console.log(`    Forwarded flags: ${forwarded.join(" ")}`);
} else {
  console.log("    Forwarded flags: <none>");
}
console.log(`    Forwarding to http://localhost:${port}`);
