#!/usr/bin/env -S deno run --allow-run=git --allow-env --allow-read --allow-write

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import {
  bold,
  cyan,
  green,
  yellow,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";

const decoder = new TextDecoder();

const repoUrl = Deno.env.get("DEEPSEEK_V3_REPO") ??
  "https://github.com/deepseek-ai/DeepSeek-V3.2-Exp.git";
const shallowEnv = Deno.env.get("DEEPSEEK_V3_SHALLOW");
const shallowClone = shallowEnv ? shallowEnv.toLowerCase() !== "false" : true;

const repoParent = join(Deno.cwd(), "third_party", "DeepSeek-V3.2-Exp");
const repoDir = join(repoParent, "source");

await Deno.mkdir(repoParent, { recursive: true });

const exists = await pathExists(repoDir);

if (!exists) {
  console.log(
    `${bold(cyan("[deepseek]"))} cloning a ${
      shallowClone ? "shallow" : "full"
    } copy from ${repoUrl}`,
  );
  const cloneArgs = [
    "clone",
    ...(shallowClone ? ["--depth", "1"] : []),
    repoUrl,
    repoDir,
  ];
  await runGit(cloneArgs);
  console.log(`${bold(green("[deepseek]"))} repository cloned into ${repoDir}`);
  Deno.exit(0);
}

if (!(await pathExists(join(repoDir, ".git")))) {
  console.error(
    `${
      bold(yellow("[deepseek]"))
    } Found existing directory without a Git checkout: ${repoDir}`,
  );
  console.error(
    "Remove the directory or point DEEPSEEK_V3_REPO to a different location.",
  );
  Deno.exit(1);
}

console.log(
  `${bold(cyan("[deepseek]"))} updating existing checkout in ${repoDir}`,
);

if (shallowClone) {
  await runGit(["fetch", "--depth", "1", "origin"], { cwd: repoDir });
} else {
  await runGit(["fetch", "origin"], { cwd: repoDir });
}

const branch =
  (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoDir }))
    .trim();
const targetRef = branch === "HEAD"
  ? (await runGit(["symbolic-ref", "refs/remotes/origin/HEAD"], {
    cwd: repoDir,
  })).trim().replace("refs/remotes/", "")
  : `origin/${branch}`;

await runGit(["reset", "--hard", targetRef], { cwd: repoDir });

if (!shallowClone) {
  await runGit([
    "pull",
    "--ff-only",
    "origin",
    branch === "HEAD" ? "HEAD" : branch,
  ], { cwd: repoDir });
}

console.log(`${bold(green("[deepseek]"))} repository synchronised.`);

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

interface GitOptions {
  cwd?: string;
}

async function runGit(
  args: string[],
  options: GitOptions = {},
): Promise<string> {
  const command = new Deno.Command("git", {
    args,
    cwd: options.cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    const message = decoder.decode(stderr).trim();
    throw new Error(
      `git ${args.join(" ")} failed${message ? `: ${message}` : ""}`,
    );
  }
  return decoder.decode(stdout);
}
