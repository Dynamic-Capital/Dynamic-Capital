#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_CONNECTION = "podman-machine-default";
const DEFAULT_SOURCE = "host.containers.internal";
const DEFAULT_ALIASES = ["host.docker.internal", "gateway.docker.internal"];

function info(message) {
  console.log(`[podman-host] ${message}`);
}

function warn(message) {
  console.warn(`[podman-host] ${message}`);
}

function error(message) {
  console.error(`[podman-host] ${message}`);
}

function parseArgs(argv) {
  let connection = DEFAULT_CONNECTION;
  let source = DEFAULT_SOURCE;
  const aliases = new Set(DEFAULT_ALIASES);

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
      case "--source":
      case "-s": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --source");
        }
        source = value;
        i += 1;
        break;
      }
      case "--alias":
      case "-a": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("Missing value for --alias");
        }
        aliases.add(value);
        i += 1;
        break;
      }
      case "--clear-default-aliases":
        aliases.clear();
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

  if (aliases.size === 0) {
    throw new Error(
      "At least one alias must be provided (after clearing defaults).",
    );
  }

  return { connection, source, aliases: Array.from(aliases) };
}

function printUsage() {
  console.log(
    `Usage: node scripts/podman/configure-local-host.mjs [options]\n\nOptions:\n  --connection, -c <name>         Podman machine and connection name (default: ${DEFAULT_CONNECTION}).\n  --source, -s <hostname>        Hostname to mirror for alias resolution (default: ${DEFAULT_SOURCE}).\n  --alias, -a <hostname>         Additional alias to configure (can be provided multiple times).\n  --clear-default-aliases        Remove the default alias set before applying --alias flags.\n  --help, -h                     Show this message.`,
  );
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
    if (result.stderr.trim()) {
      error(result.stderr.trim());
    }
    return false;
  }
  info(result.stdout.trim());
  return true;
}

async function ensureMachineRunning(connection) {
  const result = await runCommand("podman", ["machine", "start", connection], {
    allowFailure: true,
  });
  if (result.code === 0) {
    info(`Machine ${connection} started.`);
    return true;
  }

  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (combined.includes("already running")) {
    info(`Machine ${connection} already running.`);
    return true;
  }

  error(`Failed to start machine ${connection}.`);
  if (result.stderr.trim()) {
    error(result.stderr.trim());
  }
  return false;
}

async function getSourceAddress(connection, source) {
  const result = await runCommand("podman", [
    "machine",
    "ssh",
    connection,
    "getent",
    "hosts",
    source,
  ], {
    allowFailure: true,
  });

  if (result.code !== 0) {
    error(`Unable to resolve ${source} inside ${connection}.`);
    if (result.stderr.trim()) {
      error(result.stderr.trim());
    }
    return null;
  }

  const line = result.stdout.split(/\r?\n/).map((entry) => entry.trim()).find(
    Boolean,
  );
  if (!line) {
    error(`No address information returned for ${source}.`);
    return null;
  }

  const [address] = line.split(/\s+/);
  if (!isValidIPv4(address)) {
    warn(
      `Resolved ${source} to unexpected value (${address}). Continuing but alias updates may fail.`,
    );
  }
  return address;
}

function isValidIPv4(value) {
  return /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/
    .test(value);
}

function sanitizeAlias(alias) {
  if (!/^[a-zA-Z0-9.-]+$/.test(alias)) {
    throw new Error(`Alias ${alias} contains unsupported characters.`);
  }
  return alias;
}

async function aliasMatches(connection, alias, address) {
  const result = await runCommand("podman", [
    "machine",
    "ssh",
    connection,
    "getent",
    "hosts",
    alias,
  ], {
    allowFailure: true,
  });

  if (result.code !== 0) {
    return false;
  }

  const line = result.stdout.split(/\r?\n/).map((entry) => entry.trim()).find(
    Boolean,
  );
  if (!line) {
    return false;
  }
  const [current] = line.split(/\s+/);
  return current === address;
}

async function configureAlias(connection, alias, address) {
  const script =
    `if grep -q '\\b${alias}\\b' /etc/hosts; then sed -i '/\\b${alias}\\b/d' /etc/hosts; fi; echo '${address} ${alias}' >> /etc/hosts`;
  await runCommand("podman", [
    "machine",
    "ssh",
    connection,
    "sudo",
    "sh",
    "-c",
    script,
  ]);
  const verify = await runCommand("podman", [
    "machine",
    "ssh",
    connection,
    "getent",
    "hosts",
    alias,
  ], {
    allowFailure: true,
  });
  if (verify.code !== 0) {
    throw new Error(`Alias ${alias} did not resolve after update.`);
  }
  const confirmation = verify.stdout.split(/\r?\n/).map((entry) => entry.trim())
    .find(Boolean);
  info(`Configured ${alias} -> ${confirmation ?? address}.`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    printUsage();
    process.exit(1);
    return;
  }

  const { connection, source, aliases } = options;
  info(`Configuring Podman machine "${connection}".`);

  if (!(await ensurePodmanAvailable())) {
    process.exit(1);
    return;
  }

  if (!(await ensureMachineRunning(connection))) {
    process.exit(1);
    return;
  }

  const address = await getSourceAddress(connection, source);
  if (!address) {
    process.exit(1);
    return;
  }

  info(
    `Resolved ${source} to ${address}. Applying aliases: ${
      aliases.join(", ")
    }.`,
  );

  for (const alias of aliases.map(sanitizeAlias)) {
    if (alias === source) {
      info(`Skipping alias ${alias} because it matches the source hostname.`);
      continue;
    }

    try {
      if (await aliasMatches(connection, alias, address)) {
        info(`Alias ${alias} already maps to ${address}.`);
        continue;
      }
      await configureAlias(connection, alias, address);
    } catch (err) {
      error(
        `Failed to configure alias ${alias}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  error(
    `Unexpected failure: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
