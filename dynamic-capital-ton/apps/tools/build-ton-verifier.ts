import { copy } from "https://deno.land/std@0.224.0/fs/copy.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { exists } from "https://deno.land/std@0.224.0/fs/exists.ts";
import { join, dirname } from "https://deno.land/std@0.224.0/path/mod.ts";

import {
  computeSha256Hex,
  resolveProjectRoot,
} from "./_shared.ts";

const decoder = new TextDecoder();

const REQUIRED_BUILD_ENV_KEYS = [
  "VITE_VERIFIER_ID",
  "VITE_SOURCES_REGISTRY",
  "VITE_SOURCES_REGISTRY_TESTNET",
  "VITE_BACKEND_URL",
  "VITE_BACKEND_URL_TESTNET",
];

interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  allowFailure?: boolean;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

async function runCommand(
  args: string[],
  { cwd, env, allowFailure = false }: CommandOptions = {},
): Promise<CommandResult> {
  console.log(`\n$ ${args.join(" ")}`);
  const command = new Deno.Command(args[0], {
    args: args.slice(1),
    cwd,
    env,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr, success } = await command.output();
  const decodedStdout = decoder.decode(stdout);
  const decodedStderr = decoder.decode(stderr);

  if (!success && !allowFailure) {
    throw new Error(
      `Command failed with exit code ${code}: ${args.join(" ")}\n${decodedStderr}`,
    );
  }

  if (decodedStdout.trim().length > 0) {
    console.log(decodedStdout.trim());
  }
  if (decodedStderr.trim().length > 0) {
    console.error(decodedStderr.trim());
  }

  return { stdout: decodedStdout, stderr: decodedStderr, code };
}

function parseEnvFile(contents: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1);
    entries.set(key, value);
  }
  return entries;
}

async function collectBuildEnv(): Promise<{
  env: Record<string, string>;
  missing: string[];
}> {
  const fromFile = new Map<string, string>();
  const envFile = Deno.env.get("TON_VERIFIER_ENV_FILE");
  if (envFile) {
    const fileContents = await Deno.readTextFile(envFile);
    for (const [key, value] of parseEnvFile(fileContents)) {
      fromFile.set(key, value);
    }
  }

  const allKeys = new Set<string>([
    ...REQUIRED_BUILD_ENV_KEYS,
    ...fromFile.keys(),
  ]);

  const env: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const value = fromFile.get(key) ?? Deno.env.get(key) ?? "";
    env[key] = value;
    if (!value) {
      missing.push(key);
    }
  }

  return { env, missing };
}

async function writeEnvFile(
  repositoryDir: string,
  env: Record<string, string>,
) {
  const lines: string[] = [];
  for (const key of Object.keys(env).sort()) {
    lines.push(`${key}=${env[key] ?? ""}`);
  }
  const envFilePath = join(repositoryDir, ".env.local");
  await Deno.writeTextFile(envFilePath, lines.join("\n") + "\n");
}

async function ensureRepository(
  repositoryDir: string,
  remote: string,
  ref: string,
) {
  if (!(await exists(repositoryDir))) {
    await ensureDir(dirname(repositoryDir));
    await runCommand([
      "git",
      "clone",
      "--depth",
      "1",
      "--no-single-branch",
      remote,
      repositoryDir,
    ]);
  }

  await runCommand(["git", "fetch", "origin"], { cwd: repositoryDir });
  const fetchRefResult = await runCommand([
    "git",
    "fetch",
    "origin",
    ref,
  ], { cwd: repositoryDir, allowFailure: true });
  if (fetchRefResult.code !== 0) {
    console.warn(
      `Warning: could not fetch ref ${ref} from origin. Proceeding with local checkout if available.`,
    );
  }

  const checkoutResult = await runCommand([
    "git",
    "checkout",
    ref,
  ], { cwd: repositoryDir, allowFailure: true });
  if (checkoutResult.code !== 0) {
    throw new Error(
      `Unable to checkout ${ref} in ${repositoryDir}. Ensure the ref exists locally or remotely.`,
    );
  }

  const remoteRefResult = await runCommand([
    "git",
    "rev-parse",
    "--verify",
    `origin/${ref}`,
  ], { cwd: repositoryDir, allowFailure: true });
  const resetTarget = remoteRefResult.code === 0 ? `origin/${ref}` : ref;
  await runCommand([
    "git",
    "reset",
    "--hard",
    resetTarget,
  ], { cwd: repositoryDir });
  await runCommand(["git", "clean", "-fdx"], { cwd: repositoryDir });
}

async function main() {
  const projectRoot = resolveProjectRoot(import.meta.url);
  const buildRoot = join(projectRoot, "build", "verifier");
  const repositoryDir = join(buildRoot, "repo");
  const distDir = join(buildRoot, "dist");
  const artifactPath = join(buildRoot, "ton-verifier-dist.zip");
  const buildInfoPath = join(buildRoot, "build-info.json");

  const remote =
    Deno.env.get("TON_VERIFIER_REMOTE") ??
    "https://github.com/ton-blockchain/verifier.git";
  const ref = Deno.env.get("TON_VERIFIER_REF") ?? "main";

  console.log("Resolving TON Contract Verifier repository...");
  await ensureRepository(repositoryDir, remote, ref);

  const { stdout: commit } = await runCommand([
    "git",
    "rev-parse",
    "HEAD",
  ], { cwd: repositoryDir });
  const commitSha = commit.trim();

  console.log("Collecting build environment variables...");
  const { env: buildEnv, missing } = await collectBuildEnv();
  await writeEnvFile(repositoryDir, buildEnv);

  if (missing.length > 0) {
    console.warn(
      `Warning: the following environment variables are empty: ${missing.join(", ")}`,
    );
  }

  console.log("Installing dependencies with npm ci...");
  await runCommand(["npm", "ci"], { cwd: repositoryDir });

  console.log("Running lint and typecheck steps...");
  await runCommand(["npm", "run", "lint"], { cwd: repositoryDir });
  await runCommand(["npm", "run", "typecheck"], { cwd: repositoryDir });

  console.log("Building static assets...");
  const npmEnv = { ...Deno.env.toObject(), ...buildEnv };
  await runCommand(["npm", "run", "build"], {
    cwd: repositoryDir,
    env: npmEnv,
  });

  console.log("Preparing dist artifacts...");
  const repositoryDist = join(repositoryDir, "dist");
  if (!(await exists(repositoryDist))) {
    throw new Error(
      `Build output not found at ${repositoryDist}. Did the upstream build command change?`,
    );
  }

  await ensureDir(buildRoot);
  await Deno.remove(distDir, { recursive: true }).catch(() => {});
  await copy(repositoryDist, distDir, { overwrite: true });

  console.log("Creating zip artifact...");
  await Deno.remove(artifactPath).catch(() => {});
  await runCommand(["zip", "-r", artifactPath, "."], { cwd: distDir });

  const artifactBytes = await Deno.readFile(artifactPath);
  const artifactSha256 = await computeSha256Hex(artifactBytes);

  const envSummary: Record<string, string> = {};
  for (const [key, value] of Object.entries(buildEnv)) {
    envSummary[key] = value ? "<set>" : "";
  }

  const buildInfo = {
    remote,
    ref,
    commit: commitSha,
    generatedAt: new Date().toISOString(),
    artifact: {
      path: artifactPath,
      sha256: artifactSha256,
    },
    environment: envSummary,
  };
  await Deno.writeTextFile(
    buildInfoPath,
    JSON.stringify(buildInfo, null, 2) + "\n",
  );

  console.log("\nBuild complete!\n");
  console.log(`Repository:    ${remote} @ ${ref} (${commitSha})`);
  console.log(`Dist folder:   ${distDir}`);
  console.log(`Zip artifact:  ${artifactPath}`);
  console.log(`Artifact SHA:  ${artifactSha256}`);
  console.log(`Build metadata recorded at ${buildInfoPath}`);
}

if (import.meta.main) {
  await main();
}
