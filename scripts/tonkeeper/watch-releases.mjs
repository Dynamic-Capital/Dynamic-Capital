import { request } from "node:https";
import { URL } from "node:url";
import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import process from "node:process";

const DEFAULT_REPOS = [
  { owner: "tonkeeper", name: "tonkeeper-web", monitorReleases: true },
  { owner: "tonkeeper", name: "wallet-api", monitorReleases: true },
  { owner: "tonkeeper", name: "ton-connect", monitorReleases: true },
  { owner: "tonkeeper", name: "ton-assets", monitorReleases: false },
  { owner: "tonkeeper", name: "ton-console", monitorReleases: false },
];

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "dynamic-capital-tonkeeper-monitor";

const { values } = parseArgs({
  options: {
    config: { type: "string" },
    repo: { type: "string", multiple: true },
    output: { type: "string" },
    format: { type: "string", default: "jsonl" },
    delay: { type: "string" },
    token: { type: "string" },
    help: { type: "boolean", default: false },
    "no-defaults": { type: "boolean", default: false },
  },
});

function usage() {
  return `Usage: watch-releases.mjs [options]\n\n` +
    "Options:\n" +
    "  --config <file>        JSON file containing a repos array\n" +
    "  --repo owner/name[:releases]  Add repo and optionally skip release polling\n" +
    "  --no-defaults         Ignore built-in Tonkeeper targets\n" +
    "  --token <token>       GitHub token or rely on GITHUB_TOKEN/GH_TOKEN\n" +
    "  --format <json|jsonl|table>  Output format (default jsonl)\n" +
    "  --output <file>       Write results to file instead of stdout\n" +
    "  --delay <ms>          Throttle between requests (default 120)\n" +
    "  --help                Show this message\n";
}

if (values.help) {
  console.log(usage());
  process.exit(0);
}

const token = values.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const throttleMs = values.delay ? Number.parseInt(values.delay, 10) : 120;

if (Number.isNaN(throttleMs) || throttleMs < 0) {
  throw new Error(
    "--delay must be a non-negative integer representing milliseconds",
  );
}

const outputFormat = values.format;
if (!new Set(["json", "jsonl", "table"]).has(outputFormat)) {
  throw new Error("--format must be one of: json, jsonl, table");
}

async function loadConfig(path) {
  if (!path) return null;
  const file = await readFile(path, "utf8");
  const parsed = JSON.parse(file);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Config file must contain a JSON object");
  }
  const repos = Array.isArray(parsed.repos) ? parsed.repos : null;
  if (!repos) {
    throw new Error("Config file must define a 'repos' array");
  }
  return repos.map(validateRepoSpec);
}

function validateRepoSpec(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("Repository specification must be an object");
  }
  const owner = typeof spec.owner === "string" ? spec.owner.trim() : "";
  const name = typeof spec.name === "string" ? spec.name.trim() : "";
  if (!owner || !name) {
    throw new Error(
      "Repository specification requires non-empty 'owner' and 'name'",
    );
  }
  const monitorReleases = Boolean(spec.monitorReleases);
  return { owner, name, monitorReleases };
}

function parseRepoFlag(flag) {
  const trimmed = flag.trim();
  const [full, releaseFlag] = trimmed.split(":");
  const [owner, name] = full.split("/");
  if (!owner || !name) {
    throw new Error(
      `Invalid --repo value: ${flag}. Expected format owner/name[:releases]`,
    );
  }
  const monitorReleases = releaseFlag ? releaseFlag === "releases" : true;
  return { owner, name, monitorReleases };
}

async function resolveRepos() {
  const fromConfig = await loadConfig(values.config);
  const fromFlags = values.repo ? values.repo.map(parseRepoFlag) : [];
  const base = values["no-defaults"] ? [] : DEFAULT_REPOS;
  const merged = [...base, ...(fromConfig ?? []), ...fromFlags];

  const seen = new Set();
  const deduped = [];
  for (const repo of merged) {
    const spec = validateRepoSpec(repo);
    const key = `${spec.owner}/${spec.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(spec);
  }

  if (deduped.length === 0) {
    throw new Error(
      "No repositories resolved. Provide --repo or a config file, or omit --no-defaults.",
    );
  }

  return deduped;
}

function buildRequestOptions(url) {
  const target = new URL(url);
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": USER_AGENT,
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return {
    hostname: target.hostname,
    path: `${target.pathname}${target.search}`,
    method: "GET",
    protocol: target.protocol,
    family: 4,
    headers,
  };
}

async function fetchJson(url) {
  const options = buildRequestOptions(url);
  return new Promise((resolve, reject) => {
    const req = request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(body ? JSON.parse(body) : null);
          } catch (error) {
            reject(error);
          }
          return;
        }

        let errorDetail = body;
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed.message === "string") {
            errorDetail = parsed.message;
          }
        } catch (_) {
          // no-op: retain original body string
        }

        const rateLimit = res.headers["x-ratelimit-remaining"];
        const reset = res.headers["x-ratelimit-reset"];
        const parts = [`GitHub request failed: ${res.statusCode}`];
        if (errorDetail) parts.push(String(errorDetail));
        if (rateLimit === "0" && reset) {
          const resetDate = new Date(Number.parseInt(reset, 10) * 1000);
          parts.push(`Rate limit resets at ${resetDate.toISOString()}`);
        }
        reject(new Error(parts.join(" | ")));
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function getLatestRelease(owner, name) {
  const releases = await fetchJson(
    `${GITHUB_API}/repos/${owner}/${name}/releases?per_page=1`,
  );
  const latest = Array.isArray(releases) ? releases[0] : null;
  if (!latest) return null;

  const tagName = typeof latest.tag_name === "string"
    ? latest.tag_name
    : undefined;
  const publishedAt = typeof latest.published_at === "string"
    ? latest.published_at
    : undefined;
  const draft = Boolean(latest.draft);
  const prerelease = Boolean(latest.prerelease);

  if (!tagName && !publishedAt) return null;

  return { tagName, publishedAt, draft, prerelease };
}

async function getRepoMeta(owner, name) {
  return fetchJson(`${GITHUB_API}/repos/${owner}/${name}`);
}

async function gatherRepoSummary(repo) {
  const { owner, name, monitorReleases } = repo;
  const meta = await getRepoMeta(owner, name);
  const latestRelease = monitorReleases
    ? await getLatestRelease(owner, name)
    : null;

  const summary = {
    repository: `${owner}/${name}`,
    defaultBranch: meta?.default_branch,
    lastPush: meta?.pushed_at,
    openIssues: meta?.open_issues_count,
    stars: meta?.stargazers_count,
  };

  if (latestRelease) {
    summary.latestRelease = latestRelease;
  }

  return summary;
}

function outputResults(results) {
  if (outputFormat === "table") {
    console.table(results.map((item) => ({
      repository: item.repository,
      branch: item.defaultBranch,
      lastPush: item.lastPush,
      stars: item.stars,
      openIssues: item.openIssues,
      release: item.latestRelease
        ? item.latestRelease.tagName ?? "(untagged)"
        : "—",
      releasedAt: item.latestRelease?.publishedAt ?? "—",
    })));
    return JSON.stringify(results, null, 2);
  }

  if (outputFormat === "json") {
    const serialized = JSON.stringify(results, null, 2);
    console.log(serialized);
    return serialized;
  }

  for (const item of results) {
    console.log(JSON.stringify(item));
  }
  return results.map((item) => JSON.stringify(item)).join("\n");
}

async function main() {
  const repos = await resolveRepos();
  const results = [];
  const errors = [];

  for (const repo of repos) {
    try {
      const summary = await gatherRepoSummary(repo);
      results.push(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const repository = `${repo.owner}/${repo.name}`;
      errors.push({ repository, error: message });
      console.error(`Failed to fetch ${repository}: ${message}`);
    }

    if (throttleMs > 0) {
      await delay(throttleMs);
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(
      "All repository requests failed; see logs above for details.",
    );
  }

  const serialized = outputResults(results);

  if (values.output) {
    await writeFile(values.output, `${serialized}\n`, "utf8");
    console.error(`Wrote ${results.length} record(s) to ${values.output}`);
  }

  if (errors.length > 0) {
    console.error(`Completed with ${errors.length} error(s).`);
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error(usage());
  process.exitCode = 1;
}
