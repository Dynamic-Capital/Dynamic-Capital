#!/usr/bin/env -S deno run -A

import {
  dirname,
  fromFileUrl,
} from "https://deno.land/std@0.224.0/path/mod.ts";

const REPO_URL = "https://github.com/iqm-finland/iqm-academy-cheat-sheets.git";
const TARGET = fromFileUrl(
  new URL("../third_party/iqm-academy-cheat-sheets", import.meta.url),
);

const decoder = new TextDecoder();

async function directoryExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

async function runGit(args: string[]) {
  const command = new Deno.Command("git", {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    const message = decoder.decode(stderr) || decoder.decode(stdout);
    throw new Error(`git ${args.join(" ")} failed: ${message}`.trim());
  }
  const output = decoder.decode(stdout).trim();
  if (output) {
    console.log(output);
  }
}

async function ensureParent(path: string) {
  await Deno.mkdir(dirname(path), { recursive: true });
}

async function cloneRepository() {
  console.log(`Cloning IQM cheat sheets into ${TARGET}...`);
  await ensureParent(TARGET);
  await runGit(["clone", "--depth=1", REPO_URL, TARGET]);
}

async function updateRepository() {
  console.log(`Updating IQM cheat sheets in ${TARGET}...`);
  await runGit(["-C", TARGET, "fetch", "--depth=1", "origin", "main"]);
  await runGit(["-C", TARGET, "reset", "--hard", "origin/main"]);
  await runGit(["-C", TARGET, "clean", "-fdx"]);
}

if (import.meta.main) {
  try {
    if (await directoryExists(TARGET)) {
      await updateRepository();
    } else {
      await cloneRepository();
    }
    console.log(
      "IQM cheat sheets are ready under third_party/iqm-academy-cheat-sheets.",
    );
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
}
