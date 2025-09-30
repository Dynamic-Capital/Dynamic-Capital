#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_CONNECTION = "podman-machine-default";

function printUsage() {
  console.log(
    `Usage: node scripts/checklists/podman-machine-verify.mjs [options]\n\nOptions:\n  --connection, -c <name>  Podman machine and connection name (default: ${DEFAULT_CONNECTION}).\n  --skip-start             Skip attempting to start the machine.\n  --help, -h               Show this message.`,
  );
}

function info(message) {
  console.log(`[podman-checklist] ${message}`);
}

function warn(message) {
  console.warn(`[podman-checklist] ${message}`);
}

function error(message) {
  console.error(`[podman-checklist] ${message}`);
}

function parseArgs(argv) {
  let connection = DEFAULT_CONNECTION;
  let skipStart = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--connection":
      case "-c": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --connection");
        }
        connection = value;
        i += 1;
        break;
      }
      case "--skip-start":
        skipStart = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown flag: ${arg}`);
        } else {
          throw new Error(`Unexpected argument: ${arg}`);
        }
    }
  }

  return { connection, skipStart };
}

function runCommand(command, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      if (allowFailure) {
        resolve({ code: 1, stdout, stderr, error: err });
      } else {
        reject(err);
      }
    });

    child.on("close", (code) => {
      if (code !== 0 && !allowFailure) {
        reject(
          new Error(
            stderr.trim() || stdout.trim() || `${command} exited with ${code}`,
          ),
        );
        return;
      }

      resolve({ code, stdout, stderr });
    });
  });
}

async function ensurePodmanAvailable() {
  try {
    const result = await runCommand("podman", ["--version"], {
      allowFailure: true,
    });
    if (result.error && result.error.code === "ENOENT") {
      error(
        "Podman CLI not found in PATH. Install Podman Desktop or add podman to PATH.",
      );
      return false;
    }
    if (result.code !== 0) {
      error(
        "Failed to run `podman --version`. Ensure Podman is installed and accessible.",
      );
      error(result.stderr.trim() || result.stdout.trim());
      return false;
    }
    info(result.stdout.trim());
    return true;
  } catch (err) {
    error(
      `Unexpected error when probing podman CLI: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

async function startMachine(connection, skipStart) {
  if (skipStart) {
    info(`Skipping machine start for ${connection}.`);
    return true;
  }

  const result = await runCommand("podman", ["machine", "start", connection], {
    allowFailure: true,
  });

  if (result.code === 0) {
    info(`Machine ${connection} started.`);
    return true;
  }

  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (
    combined.includes("already running") ||
    combined.includes("is already running")
  ) {
    info(`Machine ${connection} already running.`);
    return true;
  }

  error(`Failed to start machine ${connection}.`);
  if (result.stderr.trim()) {
    error(result.stderr.trim());
  } else if (result.stdout.trim()) {
    error(result.stdout.trim());
  }
  return false;
}

function parseMachineList(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("{")) {
        try {
          return JSON.parse(line);
        } catch (err) {
          throw new Error(
            `Unable to parse machine list JSON: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      const [name = "", running = "", lastUp = ""] = line.split(/\s+/);
      return {
        Name: name,
        Running: running === "true" || running === "Running" || running === "1",
        LastUp: lastUp,
      };
    });
}

async function verifyMachineState(connection) {
  try {
    const result = await runCommand("podman", [
      "machine",
      "list",
      "--format",
      "{{json .}}",
    ]);

    const machines = parseMachineList(result.stdout);
    const match = machines.find((machine) => machine?.Name === connection);

    if (!match) {
      error(
        `Machine ${connection} not found. Run \`podman machine init ${connection}\` to create it.`,
      );
      return false;
    }

    if (!match.Running) {
      error(
        `Machine ${connection} is not running. Start it with \`podman machine start ${connection}\`.`,
      );
      return false;
    }

    info(
      `Machine ${connection} is running. LastUp: ${
        match.LastUp ? match.LastUp : "(not reported)"
      }.`,
    );
    return true;
  } catch (err) {
    error(
      `Failed to read machine list: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

async function inspectMachine(connection) {
  try {
    const result = await runCommand("podman", [
      "machine",
      "inspect",
      connection,
    ]);
    const raw = result.stdout.trim();
    if (!raw) {
      warn("Machine inspect returned no data.");
      return true;
    }

    let data;
    try {
      const parsed = JSON.parse(raw);
      data = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch (err) {
      warn(
        `Unable to parse inspect output as JSON: ${
          err instanceof Error ? err.message : String(err)
        }.`,
      );
      return true;
    }

    const lastUp = data?.LastUp ?? data?.LastUpTime ?? data?.LastStarted ?? "";
    info(
      `Inspect LastUp: ${
        lastUp ? lastUp : "(not reported)"
      }. Connection type: ${data?.VM?.Type ?? "unknown"}.`,
    );
    return true;
  } catch (err) {
    error(
      `Failed to inspect machine ${connection}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

function parseConnectionList(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("{")) {
        try {
          return JSON.parse(line);
        } catch (err) {
          throw new Error(
            `Unable to parse connection list JSON: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      const [name = "", uri = "", isDefault = ""] = line.split(/\s+/);
      return {
        Name: name,
        URI: uri,
        Default: isDefault.includes("(Default)") ||
          isDefault.includes("(default)"),
      };
    });
}

async function verifyConnection(connection) {
  try {
    const result = await runCommand("podman", [
      "system",
      "connection",
      "ls",
      "--format",
      "{{json .}}",
    ]);

    const connections = parseConnectionList(result.stdout);
    const match = connections.find((item) => item?.Name === connection);

    if (!match) {
      error(
        `Connection ${connection} not registered. Register it with \`podman system connection add --default ${connection} npipe://./pipe/${connection}\`.`,
      );
      return false;
    }

    if (!match.Default) {
      warn(
        `Connection ${connection} is not the default. Set it default with \`podman system connection set --default ${connection}\`.`,
      );
    } else {
      info(`Connection ${connection} is registered as the default.`);
    }

    info(`Connection URI: ${match.URI ?? "(unknown)"}`);
    return true;
  } catch (err) {
    error(
      `Failed to list connections: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

async function probeInfo() {
  try {
    const result = await runCommand("podman", ["info"], { allowFailure: true });
    if (result.code !== 0) {
      error("`podman info` failed. Ensure the machine is reachable.");
      if (result.stderr.trim()) {
        error(result.stderr.trim());
      }
      return false;
    }

    const lines = result.stdout.split(/\r?\n/).filter((line) =>
      line.trim() !== ""
    );
    const summary = lines.slice(0, 8).join("\n");
    info(`podman info (truncated):\n${summary}`);
    return true;
  } catch (err) {
    error(
      `Unexpected error running podman info: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    printUsage();
    process.exit(1);
  }

  const { connection, skipStart } = options;

  info(`Validating Podman machine "${connection}".`);

  const checks = [
    await ensurePodmanAvailable(),
    await startMachine(connection, skipStart),
    await verifyMachineState(connection),
    await inspectMachine(connection),
    await verifyConnection(connection),
    await probeInfo(),
  ];

  if (checks.every(Boolean)) {
    info("Podman machine validation succeeded.");
    return;
  }

  process.exitCode = 1;
  error(
    "One or more Podman validation steps failed. Review the output above for remediation guidance.",
  );
}

await main();
