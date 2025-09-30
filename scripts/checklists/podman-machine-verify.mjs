#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

function fail(message) {
  console.error(message);
  if (!process.exitCode) {
    process.exitCode = 1;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function ensurePodmanPresent() {
  try {
    const result = run("podman", ["--version"]);
    if (result.status !== 0) {
      fail(
        "`podman --version` returned a non-zero exit code. Ensure Podman is installed and available on your PATH.",
      );
      if (result.stderr) {
        console.error(result.stderr.trim());
      }
      return false;
    }
    return true;
  } catch (error) {
    fail(
      "Podman CLI not found. Install Podman and ensure the `podman` binary is available in your PATH.",
    );
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    return false;
  }
}

function parseJsonMachineList(output) {
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return parsed
        .map((machine) => machine.Name ?? machine.name)
        .filter((name) => typeof name === "string" && name.length > 0);
    }
  } catch (_) {
    // fall through to table parsing
  }
  return null;
}

function parseTableMachineNames(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const names = [];
  for (const line of lines.slice(1)) {
    const [rawName] = line.split(/\s+/);
    if (!rawName) continue;
    const name = rawName.replace(/\*$/, "").trim();
    if (name.length > 0) {
      names.push(name);
    }
  }

  return names;
}

function getMachineNames() {
  let result = run("podman", ["machine", "list", "--format", "json"]);
  if (result.status === 0) {
    const names = parseJsonMachineList(result.stdout.trim());
    if (names) {
      return names;
    }
  } else if (result.stderr) {
    console.error(result.stderr.trim());
  }

  result = run("podman", ["machine", "list"]);
  if (result.status !== 0) {
    fail(
      "Failed to list Podman machines. Inspect the output above and ensure Podman machine is configured.",
    );
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
    return [];
  }

  return parseTableMachineNames(result.stdout);
}

function inspectMachine(name) {
  const result = run("podman", [
    "machine",
    "inspect",
    name,
    "--format",
    "json",
  ]);
  if (result.status !== 0) {
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout.trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      const info = parsed[0];
      const state = (info?.State ?? info?.state ?? "").toString();
      return {
        name,
        state,
      };
    }
  } catch (error) {
    fail(
      `Failed to parse machine inspection output for ${name}: ${
        error instanceof Error ? error.message : String(error)
      }.`,
    );
    return null;
  }

  return null;
}

function verifyMachines(names) {
  if (!Array.isArray(names) || names.length === 0) {
    fail(
      "No Podman machines found. Create one with `podman machine init` and then start it with `podman machine start`.",
    );
    return;
  }

  const inspected = names
    .map((name) => inspectMachine(name))
    .filter((machine) => machine && machine.state);

  if (inspected.length === 0) {
    fail(
      "Unable to inspect Podman machines. Ensure you can run `podman machine inspect <name>` successfully.",
    );
    return;
  }

  const running = inspected.filter((machine) => /running/i.test(machine.state));
  if (running.length === 0) {
    const machineNames = inspected.map((machine) => machine.name).join(", ");
    fail(
      `Podman machines detected (${machineNames}), but none are running. Start one with \`podman machine start <name>\`.`,
    );
    return;
  }

  if (!process.exitCode) {
    const runningNames = running.map((machine) => machine.name).join(", ");
    console.log(
      `Validated Podman CLI availability and running machine(s): ${runningNames}.`,
    );
  }
}

function main() {
  if (!ensurePodmanPresent()) {
    return;
  }

  const names = getMachineNames();
  verifyMachines(names);
}

main();
