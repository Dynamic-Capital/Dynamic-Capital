import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
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

async function runRcloneAuthorize(authConfig: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn("rclone", ["authorize", "onedrive", authConfig], {
      stdio: ["ignore", "pipe", "inherit"],
    });

    let stdout = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`rclone exited with status ${code ?? "unknown"}`));
        return;
      }

      const token = extractToken(stdout);
      if (!token) {
        reject(new Error("Failed to parse token from rclone output"));
        return;
      }

      resolve(token);
    });
  });
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

async function loadConfig(configPath: string): Promise<string> {
  try {
    return await fs.readFile(configPath, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new Error(`rclone config not found at ${configPath}`);
    }
    throw error;
  }
}

function updateToken(
  config: string,
  remote: string,
  token: string,
): { updatedConfig: string; replaced: boolean } {
  const lines = config.split(/\r?\n/);
  let inTargetSection = false;
  let remoteFound = false;
  let tokenReplaced = false;
  let insertIndex = -1;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const sectionName = trimmed.slice(1, -1);
      if (sectionName === remote) {
        inTargetSection = true;
        remoteFound = true;
        insertIndex = index + 1;
      } else if (inTargetSection) {
        // We reached the next section.
        insertIndex = index;
        inTargetSection = false;
      } else if (!remoteFound) {
        insertIndex = index + 1;
      }
      continue;
    }

    if (inTargetSection) {
      if (trimmed.startsWith("token")) {
        lines[index] = `token = ${token}`;
        tokenReplaced = true;
      }
      insertIndex = index + 1;
    }
  }

  if (!remoteFound) {
    throw new Error(`Remote '${remote}' not found in ${"rclone.conf"}`);
  }

  if (!tokenReplaced) {
    if (insertIndex === -1) {
      insertIndex = lines.length;
    }
    lines.splice(insertIndex, 0, `token = ${token}`);
  }

  return {
    updatedConfig: lines.join("\n").replace(/\n+$/u, "") + "\n",
    replaced: tokenReplaced,
  };
}

async function writeConfig(
  configPath: string,
  updatedConfig: string,
): Promise<void> {
  const directory = path.dirname(configPath);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(configPath, updatedConfig, "utf8");
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const token = options.token ?? await runRcloneAuthorize(options.authConfig);

    console.log("✔ Token retrieved successfully");

    const configContents = await loadConfig(options.configPath);
    const { updatedConfig, replaced } = updateToken(
      configContents,
      options.remote,
      token,
    );

    if (options.dryRun) {
      console.log("ℹ Dry run enabled - not writing changes to disk.");
      console.log(
        replaced
          ? `Existing token for remote '${options.remote}' would be updated.`
          : `Token entry would be added to remote '${options.remote}'.`,
      );
      return;
    }

    await writeConfig(options.configPath, updatedConfig);
    console.log(
      replaced
        ? `✔ Updated token for remote '${options.remote}' in ${options.configPath}`
        : `✔ Added token for remote '${options.remote}' in ${options.configPath}`,
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
