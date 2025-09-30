#!/usr/bin/env -S deno run --allow-env --allow-read
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

type ParsedArgs = {
  _: string[];
  share?: string;
  list?: boolean;
  sample?: number;
  "map-drive"?: string;
  "no-persistent"?: boolean;
  json?: boolean;
  help?: boolean;
};

const enableColor = !Deno.noColor;

function colorize(text: string, open: string, close: string): string {
  if (!enableColor) {
    return text;
  }
  return `${open}${text}${close}`;
}

function bold(text: string): string {
  return colorize(text, "\u001B[1m", "\u001B[22m");
}

function green(text: string): string {
  return colorize(text, "\u001B[32m", "\u001B[39m");
}

function red(text: string): string {
  return colorize(text, "\u001B[31m", "\u001B[39m");
}

function yellow(text: string): string {
  return colorize(text, "\u001B[33m", "\u001B[39m");
}

function gray(text: string): string {
  return colorize(text, "\u001B[90m", "\u001B[39m");
}

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

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { _: [] };
  const aliasMap: Record<
    string,
    { key: keyof ParsedArgs; type: "boolean" | "string" }
  > = {
    s: { key: "share", type: "string" },
    l: { key: "list", type: "boolean" },
    j: { key: "json", type: "boolean" },
    h: { key: "help", type: "boolean" },
    m: { key: "map-drive", type: "string" },
  };

  const booleanFlags = new Set(["list", "json", "help", "no-persistent"]);
  const stringFlags = new Set(["share", "map-drive"]);
  const numberFlags = new Set(["sample"]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      result._.push(...argv.slice(index + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const [rawName, rawValue] = arg.slice(2).split("=", 2);
      const name = rawName.trim();
      if (!name) {
        throw new Error("Unexpected empty flag name.");
      }

      if (booleanFlags.has(name)) {
        result[name as keyof ParsedArgs] = true;
        continue;
      }

      if (stringFlags.has(name) || numberFlags.has(name)) {
        let value = rawValue;
        if (value === undefined) {
          value = argv[index + 1];
          if (value === undefined) {
            throw new Error(`Missing value for --${name}`);
          }
          index += 1;
        }
        if (numberFlags.has(name)) {
          const parsed = Number(value);
          if (Number.isNaN(parsed)) {
            throw new Error(
              `Expected numeric value for --${name}, received "${value}".`,
            );
          }
          result[name as keyof ParsedArgs] =
            parsed as ParsedArgs[keyof ParsedArgs];
        } else {
          result[name as keyof ParsedArgs] =
            value as ParsedArgs[keyof ParsedArgs];
        }
        continue;
      }

      throw new Error(`Unknown option: --${name}`);
    }

    if (arg.startsWith("-")) {
      const flag = arg.slice(1);
      if (flag.length !== 1) {
        throw new Error(`Unknown short option: -${flag}`);
      }
      const alias = aliasMap[flag];
      if (!alias) {
        throw new Error(`Unknown option: -${flag}`);
      }
      if (alias.type === "boolean") {
        result[alias.key] = true as ParsedArgs[keyof ParsedArgs];
        continue;
      }
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error(`Missing value for -${flag}`);
      }
      result[alias.key] = value as ParsedArgs[keyof ParsedArgs];
      index += 1;
      continue;
    }

    result._.push(arg);
  }

  return result;
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
  let args: ParsedArgs;
  try {
    args = parseArgs(Deno.args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    printUsage();
    Deno.exit(1);
    return;
  }

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
