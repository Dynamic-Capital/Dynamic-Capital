#!/usr/bin/env -S deno run --allow-env --allow-read
import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import {
  bold,
  gray,
  green,
  red,
  yellow,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";

const DEFAULT_SHARE = "\\\\wsl.localhost\\podman-machine-default";
const DEFAULT_SAMPLE = 3;

type DriveMappingResult = {
  requested: string;
  persistent: boolean;
  command?: string;
  stdout?: string;
  stderr?: string;
  success: boolean;
  error?: string;
};

type ShareReport = {
  share: string;
  fsPath: string;
  reachable: boolean;
  error?: string;
  entries: string[];
  driveMapping?: DriveMappingResult;
};

function printUsage(): void {
  console.log(
    `Podman UNC share verifier\n\n` +
      `Usage: deno run --allow-env --allow-read scripts/checklists/podman-share-check.ts [options]\n\n` +
      `Options:\n` +
      `  --share, -s <path>       UNC path to verify (default: ${DEFAULT_SHARE}).\n` +
      `  --list, -l               Output a short sample of directory entries.\n` +
      `  --sample <count>         Number of entries to sample when --list is set (default: ${DEFAULT_SAMPLE}).\n` +
      `  --map-drive, -m <letter> Attempt to map the share to the provided drive letter.\n` +
      `                           Requires Windows, net.exe, and --allow-run permissions.\n` +
      `  --no-persistent          Disable /persistent:yes when mapping the drive.\n` +
      `  --json, -j               Emit a JSON report instead of human-readable output.\n` +
      `  --help, -h               Show this message.\n`,
  );
}

function toFsPath(share: string): string {
  if (share.startsWith("\\\\")) {
    return `//${share.slice(2).replaceAll("\\\\", "/")}`;
  }
  return share.replaceAll("\\\\", "/");
}

function sanitizeDriveLetter(input: string): string {
  const letter = input.trim().toUpperCase().replace(/:$/, "");
  if (letter.length !== 1 || letter < "A" || letter > "Z") {
    throw new Error(`Invalid drive letter: ${input}`);
  }
  return letter;
}

async function mapDrive(
  share: string,
  driveLetter: string,
  persistent: boolean,
): Promise<DriveMappingResult> {
  const result: DriveMappingResult = {
    requested: driveLetter,
    persistent,
    success: false,
  };

  if (Deno.build.os !== "windows") {
    result.error = "Drive mapping is only supported on Windows hosts.";
    return result;
  }

  const args = [
    "use",
    `${driveLetter}:`,
    share,
    `/persistent:${persistent ? "yes" : "no"}`,
  ];
  result.command = `net ${args.join(" ")}`;

  try {
    const command = new Deno.Command("net", {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await command.output();
    const decoder = new TextDecoder();
    result.stdout = decoder.decode(stdout).trim();
    result.stderr = decoder.decode(stderr).trim();
    result.success = code === 0;
    if (!result.success) {
      result.error = result.stderr || `net exited with code ${code}`;
    }
  } catch (error) {
    if (error instanceof Deno.errors.PermissionDenied) {
      result.error =
        "Permission denied while invoking `net`. Re-run with --allow-run=net or -A.";
    } else if (error instanceof Error) {
      result.error = error.message;
    } else {
      result.error = String(error);
    }
  }

  return result;
}

function formatReport(report: ShareReport): string {
  const lines: string[] = [];
  lines.push(bold("Podman UNC share"));
  lines.push(`  Path: ${report.share}`);
  lines.push(`  FS Path: ${report.fsPath}`);

  if (report.reachable) {
    lines.push(`  Status: ${green("reachable")}`);
  } else {
    lines.push(`  Status: ${red("not reachable")}`);
    if (report.error) {
      lines.push(`  Error: ${report.error}`);
    }
  }

  if (report.entries.length > 0) {
    lines.push(`  Sample entries:`);
    for (const entry of report.entries) {
      lines.push(`    - ${entry}`);
    }
  } else if (report.reachable) {
    lines.push(`  Sample entries: ${gray("(not requested)")}`);
  }

  if (report.driveMapping) {
    const mapping = report.driveMapping;
    const statusColor = mapping.success ? green : yellow;
    const statusLabel = mapping.success ? "success" : "warning";
    lines.push(
      `  Drive mapping (${mapping.requested}:): ${statusColor(statusLabel)}`,
    );
    lines.push(`    Persistent: ${mapping.persistent ? "yes" : "no"}`);
    if (mapping.command) {
      lines.push(`    Command: ${mapping.command}`);
    }
    if (mapping.stdout) {
      lines.push(`    stdout: ${mapping.stdout}`);
    }
    if (mapping.stderr) {
      lines.push(`    stderr: ${mapping.stderr}`);
    }
    if (mapping.error) {
      lines.push(`    Note: ${mapping.error}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  const args = parse(Deno.args, {
    string: ["share", "map-drive"],
    boolean: ["help", "list", "json", "no-persistent"],
    number: ["sample"],
    alias: {
      share: ["s"],
      "map-drive": ["m"],
      help: ["h"],
      list: ["l"],
      json: ["j"],
    },
  });

  if (args.help) {
    printUsage();
    return;
  }

  const share = typeof args.share === "string" && args.share.length > 0
    ? args.share
    : (Deno.env.get("PODMAN_MACHINE_SHARE") ?? DEFAULT_SHARE);
  const fsPath = toFsPath(share);

  const report: ShareReport = {
    share,
    fsPath,
    reachable: false,
    entries: [],
  };

  try {
    const stat = await Deno.stat(fsPath);
    if (!stat.isDirectory) {
      report.error = "Share resolved but is not a directory.";
    } else {
      report.reachable = true;
    }
  } catch (error) {
    if (error instanceof Error) {
      report.error = error.message;
    } else {
      report.error = String(error);
    }
  }

  const shouldList = Boolean(args.list) || typeof args.sample === "number";
  const sampleSize =
    typeof args.sample === "number" && !Number.isNaN(args.sample)
      ? Math.max(0, args.sample)
      : (shouldList ? DEFAULT_SAMPLE : 0);

  if (report.reachable && sampleSize > 0) {
    try {
      let count = 0;
      for await (const entry of Deno.readDir(fsPath)) {
        report.entries.push(entry.name);
        count += 1;
        if (count >= sampleSize) break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.entries.push(`(failed to list entries: ${message})`);
    }
  }

  if (typeof args["map-drive"] === "string" && args["map-drive"].length > 0) {
    let drive: string;
    try {
      drive = sanitizeDriveLetter(args["map-drive"]);
      report.driveMapping = await mapDrive(
        share,
        drive,
        !args["no-persistent"],
      );
    } catch (error) {
      report.driveMapping = {
        requested: args["map-drive"],
        persistent: !args["no-persistent"],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(report));
  }

  let exitCode = report.reachable ? 0 : 1;
  if (report.driveMapping && !report.driveMapping.success) {
    exitCode = 1;
  }
  Deno.exit(exitCode);
}

if (import.meta.main) {
  await main();
}
