import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

interface CommitRecord {
  prNumber?: number;
}

interface CommitPayload {
  commits: CommitRecord[];
}

interface ReleaseMeta {
  version: string;
  date: string;
}

function runGh(
  args: string[],
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function ensureGh(): boolean {
  try {
    const result = runGh(["--version"]);
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

function loadReleaseMeta(cacheDir: string): ReleaseMeta | undefined {
  const metaPath = join(cacheDir, "release-meta.json");
  if (!existsSync(metaPath)) return undefined;
  return JSON.parse(readFileSync(metaPath, "utf8")) as ReleaseMeta;
}

function loadCommits(cacheDir: string): CommitPayload | undefined {
  const path = join(cacheDir, "commits.json");
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as CommitPayload;
}

async function main(): Promise<void> {
  if (process.env.SKIP_RELEASE_ANNOUNCE === "1") {
    console.info(
      "[release-announcer] Skipping announcement (SKIP_RELEASE_ANNOUNCE set).",
    );
    return;
  }
  if (!process.env.GH_TOKEN) {
    console.warn(
      "[release-announcer] GH_TOKEN missing; skipping release announcement.",
    );
    return;
  }
  if (!ensureGh()) {
    console.warn(
      "[release-announcer] gh CLI unavailable; skipping release announcement.",
    );
    return;
  }

  const cwd = process.cwd();
  const cacheDir = join(cwd, ".project-cache");
  const meta = loadReleaseMeta(cacheDir);
  if (!meta?.version) {
    console.warn(
      "[release-announcer] No release metadata found; skipping release announcement.",
    );
    return;
  }
  const releaseNotesPath = join(
    cwd,
    "docs",
    "RELEASE_NOTES",
    `${meta.version}.md`,
  );
  if (!existsSync(releaseNotesPath)) {
    console.warn(
      `[release-announcer] Release notes ${releaseNotesPath} missing; skipping release creation.`,
    );
    return;
  }

  const viewResult = runGh(["release", "view", meta.version]);
  if (viewResult.status !== 0) {
    const createArgs = [
      "release",
      "create",
      meta.version,
      "--notes-file",
      releaseNotesPath,
    ];
    if (process.env.RELEASE_TARGET_REF) {
      createArgs.push("--target", process.env.RELEASE_TARGET_REF);
    }
    const createResult = runGh(createArgs);
    if (createResult.status !== 0) {
      console.warn("[release-announcer] Failed to create GitHub release.");
      console.warn(createResult.stderr.trim());
    } else {
      console.info(
        `[release-announcer] Created GitHub release ${meta.version}.`,
      );
    }
  }

  const payload = loadCommits(cacheDir);
  const repo = process.env.GITHUB_REPOSITORY;
  if (!payload || !repo) {
    return;
  }
  const uniquePrs = Array.from(
    new Set(
      payload.commits.map((commit) => commit.prNumber).filter((
        value,
      ): value is number => Boolean(value)),
    ),
  );
  for (const pr of uniquePrs) {
    const message = `Included in ${meta.version}`;
    const commentResult = runGh([
      "pr",
      "comment",
      pr.toString(),
      "--body",
      message,
    ]);
    if (commentResult.status !== 0) {
      console.warn(`[release-announcer] Unable to comment on PR #${pr}.`);
    }
  }
}

main().catch((error) => {
  console.error("[release-announcer] Failed to announce release");
  console.error(error);
  process.exitCode = 1;
});
