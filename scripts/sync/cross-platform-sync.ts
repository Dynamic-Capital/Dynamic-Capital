import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { load as loadYaml } from "yaml";

type PlatformName =
  | "github"
  | "digitalocean"
  | "gdrive"
  | "supabase"
  | "vercel"
  | "ton";

const platformNames: PlatformName[] = [
  "github",
  "digitalocean",
  "gdrive",
  "supabase",
  "vercel",
  "ton",
];

function isPlatformName(value: string): value is PlatformName {
  return platformNames.includes(value as PlatformName);
}

interface SyncArguments {
  datasetPath: string;
  version: string;
  configPath: string;
  dryRun: boolean;
  platforms?: PlatformName[];
}

interface RepoConfig {
  platforms: Partial<Record<PlatformName, Record<string, unknown>>>;
}

interface DatasetMetadata {
  absolutePath: string;
  relativePath: string;
  datasetName: string;
  version: string;
  sizeBytes: number;
  fileCount: number;
  checksum: string;
  generatedAt: string;
  isDirectory: boolean;
}

interface SyncContext extends DatasetMetadata {
  dryRun: boolean;
  platformLocations: Record<string, string>;
}

interface PlatformResult {
  location?: string;
  platformLocations?: Record<string, string>;
}

interface PlatformHandler {
  readonly name: PlatformName;
  syncDataset(context: SyncContext): Promise<PlatformResult | void>;
}

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const repoRoot = path.resolve(__dirname, "..", "..");

class GitHubHandler implements PlatformHandler {
  readonly name = "github" as const;

  constructor(private readonly config: Record<string, unknown>) {}

  async syncDataset(context: SyncContext): Promise<void> {
    const pointerPath = this.resolveDvcPointer(context);
    if (!pointerPath) {
      return;
    }

    try {
      await access(pointerPath);
    } catch (error) {
      const message =
        `Missing DVC pointer for ${context.relativePath}. Expected file at ${
          path.relative(repoRoot, pointerPath)
        }`;
      if (context.dryRun) {
        console.warn(`[github] ${message}`);
        return;
      }
      throw new Error(message, { cause: error });
    }
  }

  private resolveDvcPointer(context: SyncContext): string | undefined {
    const pointerSuffix = this.config.pointer_suffix as string | undefined ??
      ".dvc";
    if (context.absolutePath.endsWith(pointerSuffix)) {
      return context.absolutePath;
    }

    const candidate = `${context.absolutePath}${pointerSuffix}`;
    return candidate;
  }
}

class DigitalOceanHandler implements PlatformHandler {
  readonly name = "digitalocean" as const;

  constructor(private readonly config: Record<string, unknown>) {}

  async syncDataset(context: SyncContext): Promise<PlatformResult> {
    const space = this.expectConfigValue("space");
    const region = this.expectConfigValue("region");
    const prefix = (this.config.prefix as string | undefined) ?? "datasets";
    const profile = this.config.profile as string | undefined;

    const objectKey = `${prefix}/${context.version}/${
      normalizeForUrl(context.relativePath)
    }`;
    const destination = `s3://${space}/${objectKey}`;
    const args = context.isDirectory
      ? ["s3", "sync", context.absolutePath, destination, "--region", region]
      : ["s3", "cp", context.absolutePath, destination, "--region", region];
    if (profile) {
      args.push("--profile", profile);
    }

    await runCommand("aws", args, context.dryRun);

    const baseUrl = (this.config.cdn_base_url as string | undefined) ??
      `https://${space}.${region}.digitaloceanspaces.com`;
    const artifactPath = objectKey;
    return {
      location: `${baseUrl.replace(/\/$/, "")}/${artifactPath}`,
    };
  }

  private expectConfigValue(key: string): string {
    const value = this.config[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(
        `digitalocean configuration is missing required key '${key}'`,
      );
    }
    return value;
  }
}

class GoogleDriveHandler implements PlatformHandler {
  readonly name = "gdrive" as const;

  constructor(private readonly config: Record<string, unknown>) {}

  async syncDataset(context: SyncContext): Promise<PlatformResult> {
    const remote = this.expectConfigValue("remote");
    const baseFolder = this.expectConfigValue("base_folder");
    const relative = normalizeForUrl(context.relativePath);
    const destination = path.posix.join(baseFolder, context.version, relative);
    const remotePath = `${remote}:${destination}`;

    if (context.isDirectory) {
      await runCommand(
        "rclone",
        ["sync", context.absolutePath, remotePath],
        context.dryRun,
      );
    } else {
      await runCommand(
        "rclone",
        ["copyto", context.absolutePath, remotePath],
        context.dryRun,
      );
    }

    const location = `${remote}:${destination}`;
    return { location };
  }

  private expectConfigValue(key: string): string {
    const value = this.config[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`gdrive configuration is missing required key '${key}'`);
    }
    return value;
  }
}

class VercelHandler implements PlatformHandler {
  readonly name = "vercel" as const;

  constructor(private readonly config: Record<string, unknown>) {}

  async syncDataset(context: SyncContext): Promise<PlatformResult | void> {
    const datasetApiBase = this.config.dataset_api_base as string | undefined;
    if (!datasetApiBase) {
      console.warn(
        "[vercel] dataset_api_base not configured; skipping location mapping",
      );
      return;
    }

    const location = `${datasetApiBase.replace(/\/$/, "")}/${
      encodeURIComponent(context.datasetName)
    }?version=${encodeURIComponent(context.version)}`;
    return { location };
  }
}

class TonHandler implements PlatformHandler {
  readonly name = "ton" as const;

  constructor(private readonly config: Record<string, unknown>) {}

  async syncDataset(context: SyncContext): Promise<PlatformResult> {
    const registryFile = this.expectConfigValue("registry_file");
    const network = (this.config.network as string | undefined) ?? "mainnet";
    const resolvedRegistry = path.resolve(repoRoot, registryFile);
    await ensureDirectory(path.dirname(resolvedRegistry));

    const record = {
      dataset: context.datasetName,
      version: context.version,
      checksum: context.checksum,
      size_bytes: context.sizeBytes,
      is_directory: context.isDirectory,
      network,
      recorded_at: context.generatedAt,
    };

    await upsertRecord(
      resolvedRegistry,
      record,
      "records",
      (entry) =>
        entry.dataset === record.dataset && entry.version === record.version,
    );

    const identifier = createHash("sha256").update(
      `${record.dataset}:${record.version}:${record.checksum}`,
    ).digest("hex");
    return { location: `ton://${network}/${identifier}` };
  }

  private expectConfigValue(key: string): string {
    const value = this.config[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`ton configuration is missing required key '${key}'`);
    }
    return value;
  }
}

class SupabaseHandler implements PlatformHandler {
  readonly name = "supabase" as const;

  constructor(private readonly config: Record<string, unknown>) {}

  async syncDataset(context: SyncContext): Promise<void> {
    const metadataFile = this.expectConfigValue("metadata_file");
    const resolvedMetadata = path.resolve(repoRoot, metadataFile);
    await ensureDirectory(path.dirname(resolvedMetadata));

    const datasetEntry = {
      id: `${context.datasetName}-${context.version}`,
      name: context.datasetName,
      version: context.version,
      relative_path: context.relativePath,
      checksum: context.checksum,
      size_bytes: context.sizeBytes,
      file_count: context.fileCount,
      updated_at: context.generatedAt,
      is_directory: context.isDirectory,
      platform_locations: context.platformLocations,
    };

    await upsertRecord(
      resolvedMetadata,
      datasetEntry,
      "datasets",
      (entry) => entry.id === datasetEntry.id,
    );
  }

  private expectConfigValue(key: string): string {
    const value = this.config[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(
        `supabase configuration is missing required key '${key}'`,
      );
    }
    return value;
  }
}

class CrossPlatformSync {
  private readonly handlers: Partial<Record<PlatformName, PlatformHandler>>;

  constructor(
    private readonly config: RepoConfig,
    private readonly dryRun: boolean,
  ) {
    this.handlers = this.instantiateHandlers();
  }

  async syncDataset(args: SyncArguments): Promise<void> {
    const metadata = await computeMetadata(args.datasetPath, args.version);
    console.log(
      `[metadata] ${metadata.relativePath} (${
        metadata.isDirectory ? "directory" : "file"
      }) | checksum=${metadata.checksum} | size=${metadata.sizeBytes} bytes | files=${metadata.fileCount}`,
    );

    const selectedPlatforms = args.platforms && args.platforms.length > 0
      ? args.platforms
      : (Object.keys(this.handlers) as PlatformName[]);

    const orderedHandlers = selectedPlatforms
      .map((name) => this.handlers[name])
      .filter((handler): handler is PlatformHandler => Boolean(handler))
      .sort((a, b) => handlerPriority[a.name] - handlerPriority[b.name]);

    if (orderedHandlers.length === 0) {
      throw new Error(
        "No configured platform handlers matched the requested set of platforms",
      );
    }

    let platformLocations: Record<string, string> = {};
    for (const handler of orderedHandlers) {
      const result = await handler.syncDataset({
        ...metadata,
        dryRun: this.dryRun,
        platformLocations: { ...platformLocations },
      });

      const location = result?.location;
      if (location) {
        platformLocations = { ...platformLocations, [handler.name]: location };
      }
      if (result?.platformLocations) {
        platformLocations = {
          ...platformLocations,
          ...result.platformLocations,
        };
      }

      const locationMessage = location ? ` -> ${location}` : "";
      console.log(`[${handler.name}] sync complete${locationMessage}`);
    }
  }

  private instantiateHandlers(): Partial<
    Record<PlatformName, PlatformHandler>
  > {
    const handlers: Partial<Record<PlatformName, PlatformHandler>> = {};
    const { platforms } = this.config;

    if (platforms.github) {
      handlers.github = new GitHubHandler(platforms.github);
    }
    if (platforms.digitalocean) {
      handlers.digitalocean = new DigitalOceanHandler(platforms.digitalocean);
    }
    if (platforms.gdrive) {
      handlers.gdrive = new GoogleDriveHandler(platforms.gdrive);
    }
    if (platforms.vercel) {
      handlers.vercel = new VercelHandler(platforms.vercel);
    }
    if (platforms.ton) {
      handlers.ton = new TonHandler(platforms.ton);
    }
    if (platforms.supabase) {
      handlers.supabase = new SupabaseHandler(platforms.supabase);
    }

    return handlers;
  }
}

const handlerPriority: Record<PlatformName, number> = {
  github: 10,
  digitalocean: 20,
  gdrive: 30,
  vercel: 40,
  ton: 50,
  supabase: 60,
};

async function computeMetadata(
  datasetPath: string,
  version: string,
): Promise<DatasetMetadata> {
  const absolutePath = path.resolve(repoRoot, datasetPath);
  const stats = await stat(absolutePath);
  const relativePath = path.relative(repoRoot, absolutePath);
  if (relativePath.startsWith("..")) {
    throw new Error(
      `Dataset path '${datasetPath}' must be inside the repository root`,
    );
  }
  const datasetName = path.basename(relativePath).replace(/\.[^.]+$/, "");
  const isDirectory = stats.isDirectory();
  const { checksum, sizeBytes, fileCount } = isDirectory
    ? await digestDirectory(absolutePath)
    : await digestFile(absolutePath, relativePath);

  return {
    absolutePath,
    relativePath,
    datasetName,
    version,
    sizeBytes,
    fileCount,
    checksum,
    generatedAt: new Date().toISOString(),
    isDirectory,
  };
}

async function digestDirectory(directory: string) {
  const hash = createHash("sha256");
  const files: string[] = await collectFiles(directory);
  files.sort();

  let totalSize = 0;
  for (const file of files) {
    const relative = path.relative(directory, file).split(path.sep).join(
      path.posix.sep,
    );
    hash.update(relative);
    const fileStats = await stat(file);
    totalSize += fileStats.size;

    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(file);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("error", reject);
      stream.on("end", resolve);
    });
  }

  return {
    checksum: hash.digest("hex"),
    sizeBytes: totalSize,
    fileCount: files.length,
  };
}

async function digestFile(filePath: string, relativePath: string) {
  const hash = createHash("sha256");
  const stats = await stat(filePath);
  const normalized = relativePath.split(path.sep).join(path.posix.sep);
  hash.update(normalized);

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });

  return {
    checksum: hash.digest("hex"),
    sizeBytes: stats.size,
    fileCount: 1,
  };
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      const nested = await collectFiles(fullPath);
      files.push(...nested);
    }
  }

  return files;
}

async function ensureDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

async function upsertRecord<T extends Record<string, unknown>>(
  filePath: string,
  record: T,
  topLevelKey: string,
  matcher: (entry: T) => boolean,
): Promise<void> {
  let content: Record<string, unknown> = {};

  try {
    const raw = await readFile(filePath, "utf8");
    content = JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const list = Array.isArray(content[topLevelKey])
    ? [...content[topLevelKey] as T[]]
    : [];
  const existingIndex = list.findIndex(matcher);
  if (existingIndex >= 0) {
    list[existingIndex] = record;
  } else {
    list.push(record);
  }

  content[topLevelKey] = list;
  await writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

async function runCommand(
  command: string,
  args: string[],
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] ${command} ${args.join(" ")}`);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function normalizeForUrl(value: string): string {
  return value.split(path.sep).join("/");
}

async function loadConfig(configPath: string): Promise<RepoConfig> {
  const resolved = path.resolve(repoRoot, configPath);
  const raw = await readFile(resolved, "utf8");
  const parsed = loadYaml(raw) as Partial<RepoConfig>;
  return {
    platforms: parsed.platforms ?? {},
  };
}

function parseArguments(argv: string[]): SyncArguments {
  const args: Partial<SyncArguments> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--dataset":
        args.datasetPath = argv[++index];
        break;
      case "--version":
        args.version = argv[++index];
        break;
      case "--config":
        args.configPath = argv[++index];
        break;
      case "--platforms": {
        const value = argv[++index] ?? "";
        const candidates = value.split(",").map((entry) => entry.trim()).filter(
          Boolean,
        );
        const platforms = candidates.filter(isPlatformName);
        if (platforms.length === 0) {
          throw new Error(
            "--platforms must contain at least one supported platform name",
          );
        }
        args.platforms = platforms;
        break;
      }
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.datasetPath) {
    throw new Error("--dataset is required");
  }
  if (!args.version) {
    throw new Error("--version is required");
  }
  if (!args.configPath) {
    args.configPath = "config/platforms.yaml";
  }

  return {
    datasetPath: args.datasetPath,
    version: args.version,
    configPath: args.configPath,
    dryRun: args.dryRun ?? false,
    platforms: args.platforms,
  };
}

(async () => {
  try {
    const cliArgs = parseArguments(process.argv.slice(2));
    const repoConfig = await loadConfig(cliArgs.configPath);
    const controller = new CrossPlatformSync(repoConfig, cliArgs.dryRun);
    await controller.syncDataset(cliArgs);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
