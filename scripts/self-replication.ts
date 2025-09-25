#!/usr/bin/env -S deno run -A
import { parse } from "jsr:@std/cli/parse";
import { ensureDir } from "jsr:@std/fs/ensure_dir";
import { exists } from "jsr:@std/fs/exists";
import { dirname, join, relative, resolve } from "jsr:@std/path";

const decoder = new TextDecoder();

interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  quiet?: boolean;
  allowFailure?: boolean;
}

async function runCommand(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const { cwd, env, quiet = false, allowFailure = false } = options;
  if (!quiet) {
    const displayCwd = cwd ? relative(Deno.cwd(), cwd) || "." : ".";
    console.log(`$ (${displayCwd}) ${command} ${args.join(" ")}`);
  }

  const cmd = new Deno.Command(command, {
    args,
    cwd,
    env,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await cmd.output();
  const stdoutText = decoder.decode(stdout).trimEnd();
  const stderrText = decoder.decode(stderr).trimEnd();

  if (!quiet) {
    if (stdoutText.length > 0) {
      console.log(stdoutText);
    }
    if (stderrText.length > 0) {
      console.error(stderrText);
    }
  }

  if (code !== 0 && !allowFailure) {
    throw new Error(
      `Command failed with exit code ${code}: ${command} ${args.join(" ")}`,
    );
  }

  return { code, stdout: stdoutText, stderr: stderrText };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

function banner(message: string) {
  console.log(`\n=== ${message} ===`);
}

async function detectOrigin(): Promise<string | undefined> {
  const result = await runCommand(
    "git",
    ["config", "--get", "remote.origin.url"],
    { quiet: true, allowFailure: true },
  );

  if (result.code === 0) {
    const value = result.stdout.trim();
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

async function detectCurrentBranch(cwd: string): Promise<string | undefined> {
  const result = await runCommand(
    "git",
    ["rev-parse", "--abbrev-ref", "HEAD"],
    { cwd, quiet: true, allowFailure: true },
  );

  if (result.code === 0) {
    const branch = result.stdout.trim();
    if (branch.length > 0 && branch !== "HEAD") {
      return branch;
    }
  }
  return undefined;
}

async function cloneRepository(
  source: string,
  destination: string,
  branch?: string,
) {
  banner(`Cloning ${source} → ${destination}`);
  await ensureDir(dirname(destination));

  const cloneArgs = ["clone", "--depth", "1"];
  if (branch) {
    cloneArgs.push("--branch", branch);
  }
  cloneArgs.push(source, destination);
  await runCommand("git", cloneArgs);
}

async function updateRepository(dest: string, branch?: string) {
  banner(`Updating existing repository at ${dest}`);
  await runCommand("git", ["fetch", "--prune", "--tags", "--force"], {
    cwd: dest,
  });

  const branchToUse = branch ?? await detectCurrentBranch(dest);
  if (branchToUse) {
    await runCommand("git", ["checkout", branchToUse], { cwd: dest });
    const remoteRef = `origin/${branchToUse}`;
    await runCommand("git", ["reset", "--hard", remoteRef], { cwd: dest });
  } else {
    await runCommand("git", ["pull", "--ff-only"], { cwd: dest });
  }
}

async function removeGitHistory(dest: string) {
  const gitDir = join(dest, ".git");
  if (await exists(gitDir)) {
    banner("Stripping Git metadata for template mode");
    await Deno.remove(gitDir, { recursive: true });
  }
}

async function createArchive(dest: string, archivePath: string) {
  banner(`Creating archive at ${archivePath}`);
  await ensureDir(dirname(archivePath));
  const tarArgs = ["-czf", archivePath, "-C", dest, "."];
  await runCommand("tar", tarArgs);
}

async function main() {
  const flags = parse(Deno.args, {
    string: ["repo", "branch", "dest", "archive"],
    boolean: [
      "install",
      "build",
      "lint",
      "typecheck",
      "test",
      "force",
      "update",
      "template",
      "initGit",
    ],
    alias: {
      r: "repo",
      b: "branch",
      d: "dest",
      a: "archive",
    },
    default: {
      install: true,
      build: true,
      lint: false,
      typecheck: false,
      test: false,
      force: false,
      update: false,
      template: false,
      initGit: false,
    },
  });

  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = resolve(
    typeof flags.dest === "string"
      ? flags.dest
      : join("replicas", `dynamic-capital-${now}`),
  );

  const sourceRepo = typeof flags.repo === "string"
    ? flags.repo
    : await detectOrigin() ?? ".";
  const branch = typeof flags.branch === "string" && flags.branch.length > 0
    ? flags.branch
    : undefined;
  const archivePath = typeof flags.archive === "string" &&
      flags.archive.length > 0
    ? resolve(flags.archive)
    : undefined;

  const destExists = await pathExists(dest);

  if (destExists && !flags.update) {
    if (!flags.force) {
      throw new Error(
        `Destination ${dest} already exists. Use --force to overwrite or --update to pull changes.`,
      );
    }

    banner(`Removing existing directory ${dest}`);
    await Deno.remove(dest, { recursive: true });
  }

  if (!destExists || flags.force) {
    await cloneRepository(sourceRepo, dest, branch);
  } else if (flags.update) {
    await updateRepository(dest, branch);
  }

  if (flags.template) {
    await removeGitHistory(dest);
    if (flags.initGit) {
      banner("Initializing fresh Git repository");
      await runCommand("git", ["init"], { cwd: dest });
    }
  }

  const summary: Record<string, unknown> = {
    source: sourceRepo,
    destination: dest,
  };

  async function runWorkspaceCommand(script: string, command: string[]) {
    summary[script] = true;
    await runCommand(command[0], command.slice(1), { cwd: dest });
  }

  if (flags.install) {
    await runWorkspaceCommand("install", ["npm", "ci"]);
  } else {
    summary.install = false;
  }

  if (flags.build) {
    await runWorkspaceCommand("build", ["npm", "run", "build"]);
  } else {
    summary.build = false;
  }

  if (flags.lint) {
    await runWorkspaceCommand("lint", ["npm", "run", "lint"]);
  } else {
    summary.lint = false;
  }

  if (flags.typecheck) {
    await runWorkspaceCommand("typecheck", ["npm", "run", "typecheck"]);
  } else {
    summary.typecheck = false;
  }

  if (flags.test) {
    await runWorkspaceCommand("test", ["npm", "run", "test"]);
  } else {
    summary.test = false;
  }

  const commitResult = await runCommand(
    "git",
    ["rev-parse", "HEAD"],
    { cwd: dest, quiet: true, allowFailure: true },
  );
  if (commitResult.code === 0) {
    summary.commit = commitResult.stdout.trim();
  }

  if (archivePath) {
    await createArchive(dest, archivePath);
    summary.archive = archivePath;
  }

  console.log("\nReplication summary:");
  console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("\n❌ Self-replication failed:", error.message ?? error);
    Deno.exit(1);
  });
}
