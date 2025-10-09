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

interface BuildEnvResult {
  env: Record<string, string>;
  missing: string[];
  missingRequired: string[];
}

async function collectBuildEnv(projectRoot: string): Promise<BuildEnvResult> {
  const fromFile = new Map<string, string>();
  const envFile = Deno.env.get("TON_VERIFIER_ENV_FILE");
  if (envFile) {
    const envFilePath = envFile.startsWith("/")
      ? envFile
      : join(projectRoot, envFile);
    if (!(await exists(envFilePath))) {
      throw new Error(
        `TON_VERIFIER_ENV_FILE set to ${envFile}, but no file was found at ${envFilePath}.`,
      );
    }
    const fileContents = await Deno.readTextFile(envFilePath);
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
  const missingRequired: string[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const value = fromFile.get(key) ?? Deno.env.get(key) ?? "";
    env[key] = value;
    if (!value) {
      missing.push(key);
      if (REQUIRED_BUILD_ENV_KEYS.includes(key)) {
        missingRequired.push(key);
      }
    }
  }

  return { env, missing, missingRequired };
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

  const currentRemoteResult = await runCommand([
    "git",
    "remote",
    "get-url",
    "origin",
  ], { cwd: repositoryDir, allowFailure: true });
  const currentRemoteUrl = currentRemoteResult.stdout.trim();
  if (currentRemoteResult.code !== 0) {
    await runCommand([
      "git",
      "remote",
      "remove",
      "origin",
    ], { cwd: repositoryDir, allowFailure: true });
    await runCommand([
      "git",
      "remote",
      "add",
      "origin",
      remote,
    ], { cwd: repositoryDir });
  } else if (currentRemoteUrl !== remote) {
    console.log(
      `Updating origin remote from ${currentRemoteUrl} to ${remote}...`,
    );
    await runCommand([
      "git",
      "remote",
      "set-url",
      "origin",
      remote,
    ], { cwd: repositoryDir });
  }

  await runCommand([
    "git",
    "fetch",
    "origin",
    "--prune",
  ], { cwd: repositoryDir });
  await runCommand([
    "git",
    "fetch",
    "origin",
    "--tags",
  ], { cwd: repositoryDir, allowFailure: true });

  const isCommitSha = /^[0-9a-f]{7,40}$/i.test(ref);
  if (isCommitSha) {
    await runCommand([
      "git",
      "fetch",
      "origin",
      ref,
    ], { cwd: repositoryDir });
  } else {
    await runCommand([
      "git",
      "fetch",
      "origin",
      ref,
    ], { cwd: repositoryDir, allowFailure: true });
  }

  const candidateRefs = Array.from(
    new Set<string>([
      ref,
      ref.startsWith("refs/") ? ref : `refs/heads/${ref}`,
      ref.startsWith("refs/") ? ref : `refs/tags/${ref}`,
      `origin/${ref}`,
      `refs/remotes/origin/${ref}`,
    ]),
  ).filter(Boolean);

  let resolvedCommit = "";
  for (const candidate of candidateRefs) {
    const revParse = await runCommand([
      "git",
      "rev-parse",
      "--verify",
      candidate,
    ], { cwd: repositoryDir, allowFailure: true });
    if (revParse.code === 0) {
      resolvedCommit = revParse.stdout.trim();
      break;
    }
  }

  if (!resolvedCommit) {
    throw new Error(
      `Unable to resolve a commit for ref ${ref}. Confirm that the branch, tag, or commit exists in ${remote}.`,
    );
  }

  await runCommand([
    "git",
    "checkout",
    "--force",
    "--detach",
    resolvedCommit,
  ], { cwd: repositoryDir });
  await runCommand([
    "git",
    "reset",
    "--hard",
    resolvedCommit,
  ], { cwd: repositoryDir });
  await runCommand(["git", "clean", "-fdx"], { cwd: repositoryDir });
  await runCommand([
    "git",
    "submodule",
    "update",
    "--init",
    "--recursive",
  ], { cwd: repositoryDir, allowFailure: true });
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
  const { env: buildEnv, missing, missingRequired } = await collectBuildEnv(
    projectRoot,
  );
  await writeEnvFile(repositoryDir, buildEnv);

  if (missing.length > 0) {
    console.warn(
      `Warning: the following environment variables are empty: ${missing.join(", ")}`,
    );
  }
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingRequired.join(", ")}. Populate them via secrets or TON_VERIFIER_ENV_FILE.`,
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
