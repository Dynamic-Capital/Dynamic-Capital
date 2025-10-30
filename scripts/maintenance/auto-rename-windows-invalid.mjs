#!/usr/bin/env node
import { spawnSync } from "node:child_process";

// Config
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN (or GH_TOKEN) is required to open PRs.");
  process.exit(2);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    const msg = r.stderr?.trim() || r.stdout?.trim() ||
      `${cmd} ${args.join(" ")} failed`;
    throw new Error(msg);
  }
  return r.stdout.trim();
}

function parseOrigin(url) {
  // https://github.com/owner/repo.git OR git@github.com:owner/repo.git
  const https = url.match(
    /^https:\/\/github.com\/([^/]+)\/([^\.]+)(?:\.git)?$/i,
  );
  if (https) return { owner: https[1], repo: https[2] };
  const ssh = url.match(/^git@github.com:([^/]+)\/([^\.]+)(?:\.git)?$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  throw new Error(`Unsupported origin URL: ${url}`);
}

const originUrl = run("git", ["remote", "get-url", "origin"]);
const { owner, repo } = parseOrigin(originUrl);

const API = "https://api.github.com";
async function gh(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      "authorization": `Bearer ${TOKEN}`,
      "accept": "application/vnd.github+json",
      "user-agent": "windows-filename-sanitizer",
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${path} -> ${res.status} ${text}`);
  }
  return res.json();
}

function nowId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${
    pad(d.getHours())
  }${pad(d.getMinutes())}`;
}

const forbiddenChars = /[<>:"/\\|?*]/g; // invalid on Windows
const reservedNames = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

function sanitizeSegment(seg) {
  let out = seg.replace(forbiddenChars, "-");
  // Trim trailing space/dot
  out = out.replace(/[ .]+$/g, "");
  if (!out) out = "_";
  if (reservedNames.has(out.toUpperCase())) out = `${out}_file`;
  return out;
}

function sanitizePath(rel) {
  const parts = rel.split("/");
  const mapped = parts.map(sanitizeSegment);
  const s = mapped.join("/");
  if (s.length > 240) {
    // trim middle if too long
    const extIdx = s.lastIndexOf(".");
    if (extIdx > -1) {
      const name = s.slice(0, extIdx);
      const ext = s.slice(extIdx);
      const keep = 240 - ext.length;
      return name.slice(0, keep).replace(/\/$/, "") + ext;
    }
    return s.slice(0, 240);
  }
  return s;
}

(async () => {
  const repoInfo = await gh(`/repos/${owner}/${repo}`);
  const baseBranch = process.env.BASE_BRANCH || repoInfo.default_branch ||
    "main";
  const baseRef = await gh(
    `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
  );
  const baseCommitSha = baseRef.object.sha;
  const baseCommit = await gh(
    `/repos/${owner}/${repo}/git/commits/${baseCommitSha}`,
  );
  const treeSha = baseCommit.tree.sha;
  const fullTree = await gh(
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
  );

  const entries = fullTree.tree || [];
  const blobs = entries.filter((e) => e.type === "blob");
  const offenders = [];
  const targetSet = new Set(blobs.map((b) => b.path));
  const mapping = new Map();

  for (const b of blobs) {
    const original = b.path;
    const bad = /[<>:"/\\|?*]|[ .]+$/.test(original.split("/").slice(-1)[0]);
    const segments = original.split("/");
    const hasBadDir = segments.slice(0, -1).some((seg) =>
      /[<>:"/\\|?*]|[ .]+$/.test(seg)
    );
    if (bad || hasBadDir) {
      let candidate = sanitizePath(original);
      if (candidate === original) continue;
      // avoid collisions
      let uniq = candidate;
      let i = 1;
      while (targetSet.has(uniq) || mapping.has(uniq)) {
        const extIdx = candidate.lastIndexOf(".");
        if (extIdx > -1) {
          uniq = `${candidate.slice(0, extIdx)}-renamed-${i}${
            candidate.slice(extIdx)
          }`;
        } else {
          uniq = `${candidate}-renamed-${i}`;
        }
        i += 1;
      }
      mapping.set(original, uniq);
      targetSet.add(uniq);
      offenders.push({ original, target: uniq, mode: b.mode, sha: b.sha });
    }
  }

  if (offenders.length === 0) {
    console.log("No Windows-invalid filenames found.");
    return;
  }

  const branchName = `fix/windows-filenames-${nowId()}`;
  console.log(
    `Preparing branch ${branchName} with ${offenders.length} renames...`,
  );

  // Build a new tree by applying copies and deletions
  const treeEdits = [];
  for (const o of offenders) {
    treeEdits.push({
      path: o.target,
      mode: o.mode || "100644",
      type: "blob",
      sha: o.sha,
    });
    treeEdits.push({ path: o.original, sha: null }); // delete original
  }

  const newTree = await gh(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: treeSha, tree: treeEdits }),
  });

  const message =
    `fix(windows): sanitize invalid filenames\n\nRenamed ${offenders.length} path(s) to remove Windows-prohibited characters.\n\nRules:\n- Replace < > : " / \\ | ? * with '-'\n- Trim trailing spaces and dots\n- Avoid reserved names (CON, PRN, AUX, NUL, COM1..9, LPT1..9)`;

  const newCommit = await gh(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [baseCommitSha],
    }),
  });

  await gh(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: newCommit.sha,
    }),
  });

  const pr = await gh(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: "fix(windows): sanitize invalid filenames",
      head: branchName,
      base: baseBranch,
      body: offenders.map((o) => `- ${o.original} -> ${o.target}`).join("\n"),
    }),
  });

  console.log(`Opened PR: ${pr.html_url}`);
})();
