import { spawn } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

interface CliOptions {
  remote: string;
  configPath: string;
  authConfig: string;
  token?: string;
  dryRun: boolean;
}

const DEFAULT_REMOTE = "onedrive";
const DEFAULT_CONFIG_PATH = path.join(
  homedir(),
  ".config",
  "rclone",
  "rclone.conf",
);
const DEFAULT_AUTH_CONFIG = "eyJyZWdpb24iOiJjbiIsInRlbmFudCI6IkR5bmFtaWMifQ";

function printHelp(): void {
  console.log(
    `Usage: tsx scripts/onedrive/authorize.ts [options]\n\n` +
      `Options:\n` +
      `  --remote <name>        Name of the rclone remote to update (default: ${DEFAULT_REMOTE}).\n` +
      `  --config <path>        Path to rclone.conf (default: ${DEFAULT_CONFIG_PATH}).\n` +
      `  --auth <json|base64>   Authorization parameters for rclone authorize.\n` +
      `                        Defaults to the provided Dynamic tenant payload.\n` +
      `  --token <json>         Skip the authorization flow and use the provided token JSON.\n` +
      `  --dry-run              Perform all steps without writing to the config file.\n` +
      `                        The remote must already exist (create it with 'rclone config').\n` +
      `  --help                 Show this help message.\n`,
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    remote: DEFAULT_REMOTE,
    configPath: DEFAULT_CONFIG_PATH,
    authConfig: DEFAULT_AUTH_CONFIG,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    switch (arg) {
      case "--remote": {
        const value = argv[++index];
        if (!value) throw new Error("--remote requires a value");
        options.remote = value;
        break;
      }
      case "--config": {
        const value = argv[++index];
        if (!value) throw new Error("--config requires a value");
        options.configPath = value;
        break;
      }
      case "--auth": {
        const value = argv[++index];
        if (!value) throw new Error("--auth requires a value");
        options.authConfig = value;
        break;
      }
      case "--token": {
        const value = argv[++index];
        if (!value) throw new Error("--token requires a value");
        options.token = value;
        break;
      }
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function runRclone(
  args: string[],
  { captureStdout = false }: { captureStdout?: boolean } = {},
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn("rclone", args, {
      stdio: ["ignore", "pipe", "inherit"],
    });

    let stdout = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      if (captureStdout) {
        stdout += chunk.toString();
      }
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "rclone executable not found. Install rclone and ensure it is on your PATH.",
          ),
        );
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`rclone exited with status ${code ?? "unknown"}`));
        return;
      }

      resolve(stdout.trim());
    });
  });
}

async function runRcloneAuthorize(authConfig: string): Promise<string> {
  const output = await runRclone(
    ["authorize", "onedrive", authConfig],
    { captureStdout: true },
  );

  const token = extractToken(output);
  if (!token) {
    throw new Error("Failed to parse token from rclone output");
  }

  return token;
}

function extractToken(output: string): string | null {
  const matches = output.match(/\{[\s\S]*\}/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  for (let index = matches.length - 1; index >= 0; index--) {
    const candidate = matches[index];
    try {
      JSON.parse(candidate);
      return candidate.trim();
    } catch {
      // Continue searching for a parsable JSON block.
    }
  }

  return null;
}

async function remoteExists(
  remote: string,
  configPath: string,
): Promise<boolean> {
  const output = await runRclone([
    "listremotes",
    "--config",
    configPath,
  ], { captureStdout: true });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/:$/, ""))
    .filter(Boolean)
    .includes(remote);
}

async function updateRemoteToken(
  remote: string,
  configPath: string,
  token: string,
): Promise<void> {
  await runRclone([
    "config",
    "update",
    remote,
    "token",
    token,
    "--config",
    configPath,
    "--non-interactive",
  ]);
}

function expandConfigPath(configPath: string): string {
  if (configPath.startsWith("~/")) {
    return path.join(homedir(), configPath.slice(2));
  }
  return path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const configPath = expandConfigPath(options.configPath);
    const token = (
      options.token ?? await runRcloneAuthorize(options.authConfig)
    ).trim();

    console.log("✔ Token retrieved successfully");

    if (options.dryRun) {
      console.log("ℹ Dry run enabled - not writing changes to disk.");
      console.log(
        `Would run: rclone config update ${options.remote} token <redacted> --config ${configPath}`,
      );
      console.log(
        "Ensure the remote exists by running 'rclone config' before executing without --dry-run.",
      );
      return;
    }

    const exists = await remoteExists(options.remote, configPath);
    if (!exists) {
      throw new Error(
        `Remote '${options.remote}' not found. Run 'rclone config' to create it before updating the token.`,
      );
    }

    await updateRemoteToken(options.remote, configPath, token);
    console.log(
      `✔ Updated token for remote '${options.remote}' via rclone config in ${configPath}`,
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

await main();
