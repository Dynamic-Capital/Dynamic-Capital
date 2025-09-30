#!/usr/bin/env node

import { request } from "node:https";
import { URL } from "node:url";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import process from "node:process";

const USER_AGENT = "dynamic-capital-tonkeeper-snapshot";
const API_ROOT = "https://api.github.com";

const { values } = parseArgs({
  options: {
    org: { type: "string", default: "tonkeeper" },
    repo: { type: "string", multiple: true },
    token: { type: "string" },
    output: { type: "string" },
    format: { type: "string", default: "json" },
    "include-forks": { type: "boolean", default: false },
    delay: { type: "string", default: "150" },
    limit: { type: "string" },
  },
});

const token = values.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const throttleMs = Number.parseInt(values.delay, 10);
if (Number.isNaN(throttleMs) || throttleMs < 0) {
  throw new Error(
    "--delay must be a non-negative integer representing milliseconds",
  );
}

const outputFormat = values.format;
if (!new Set(["json", "jsonl", "pretty"]).has(outputFormat)) {
  throw new Error("--format must be one of: json, jsonl, pretty");
}

const includeForks = values["include-forks"];
const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
if (limit !== undefined && (Number.isNaN(limit) || limit <= 0)) {
  throw new Error("--limit must be a positive integer when provided");
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

async function fetchJson(url, { allowNotFound = false } = {}) {
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

        if (allowNotFound && res.statusCode === 404) {
          resolve(null);
          return;
        }

        let errorDetail = body;
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed.message === "string") {
            errorDetail = parsed.message;
          }
        } catch (_) {
          // no-op: retain raw body
        }

        const rateRemaining = res.headers["x-ratelimit-remaining"];
        const reset = res.headers["x-ratelimit-reset"];
        const parts = [`GitHub request failed: ${res.statusCode}`];
        if (errorDetail) parts.push(String(errorDetail));
        if (rateRemaining === "0" && reset) {
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

async function delay(ms) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllOrgRepos(org) {
  const repos = [];
  let page = 1;
  while (true) {
    const url = `${API_ROOT}/orgs/${org}/repos?per_page=100&page=${page}`;
    const batch = await fetchJson(url);
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
    await delay(throttleMs);
    if (limit && repos.length >= limit) {
      return repos.slice(0, limit);
    }
  }
  return repos;
}

async function fetchRepo(owner, name) {
  return fetchJson(`${API_ROOT}/repos/${owner}/${name}`);
}

async function fetchLanguages(owner, name) {
  const data = await fetchJson(`${API_ROOT}/repos/${owner}/${name}/languages`);
  if (!data || typeof data !== "object") return {};
  return data;
}

async function fetchLatestRelease(owner, name) {
  const releases = await fetchJson(
    `${API_ROOT}/repos/${owner}/${name}/releases?per_page=1`,
    { allowNotFound: true },
  );
  if (!Array.isArray(releases) || releases.length === 0) {
    return null;
  }
  const [latest] = releases;
  const tagName = typeof latest.tag_name === "string" ? latest.tag_name : null;
  const publishedAt = typeof latest.published_at === "string"
    ? latest.published_at
    : null;
  return tagName || publishedAt
    ? {
      tagName: tagName ?? undefined,
      publishedAt: publishedAt ?? undefined,
      draft: Boolean(latest.draft),
      prerelease: Boolean(latest.prerelease),
    }
    : null;
}

function normaliseRepoEntry(entry) {
  if (!entry) return null;
  if (typeof entry.owner === "string" && typeof entry.name === "string") {
    return {
      owner: entry.owner,
      name: entry.name,
      fullName: entry.fullName ?? `${entry.owner}/${entry.name}`,
      private: Boolean(entry.private),
      fork: Boolean(entry.fork),
      description: entry.description ?? entry.desc ?? undefined,
      htmlUrl: entry.htmlUrl ?? entry.html_url ?? undefined,
      defaultBranch: entry.defaultBranch ?? entry.default_branch ?? undefined,
      pushedAt: entry.pushedAt ?? entry.pushed_at ?? undefined,
      createdAt: entry.createdAt ?? entry.created_at ?? undefined,
      updatedAt: entry.updatedAt ?? entry.updated_at ?? undefined,
      stargazers: typeof entry.stargazers === "number"
        ? entry.stargazers
        : typeof entry.stargazers_count === "number"
        ? entry.stargazers_count
        : undefined,
      topics: Array.isArray(entry.topics) ? entry.topics : undefined,
    };
  }

  const owner = entry.owner?.login ?? null;
  const name = entry.name ?? null;
  if (!owner || !name) return null;
  return {
    owner,
    name,
    fullName: entry.full_name ?? `${owner}/${name}`,
    private: Boolean(entry.private),
    fork: Boolean(entry.fork),
    description: entry.description ?? undefined,
    htmlUrl: entry.html_url ?? undefined,
    defaultBranch: entry.default_branch ?? undefined,
    pushedAt: entry.pushed_at ?? undefined,
    createdAt: entry.created_at ?? undefined,
    updatedAt: entry.updated_at ?? undefined,
    stargazers: typeof entry.stargazers_count === "number"
      ? entry.stargazers_count
      : undefined,
    topics: Array.isArray(entry.topics) ? entry.topics : undefined,
  };
}

function selectRepos(base, additional) {
  const map = new Map();
  for (const repo of base) {
    const normalised = normaliseRepoEntry(repo);
    if (!normalised) continue;
    if (!includeForks && normalised.fork) continue;
    const key = `${normalised.owner}/${normalised.name}`;
    if (!map.has(key)) {
      map.set(key, normalised);
    }
  }

  for (const repo of additional ?? []) {
    const trimmed = repo.trim();
    if (!trimmed) continue;
    const [owner, name] = trimmed.split("/");
    if (!owner || !name) {
      throw new Error(`Invalid --repo value: ${repo}. Expected owner/name`);
    }
    const key = `${owner}/${name}`;
    if (!map.has(key)) {
      map.set(key, { owner, name, fullName: key });
    }
  }

  return Array.from(map.values());
}

function aggregateLanguages(records) {
  const totals = new Map();
  for (const record of records) {
    if (!record.languages) continue;
    for (const [language, bytes] of Object.entries(record.languages)) {
      const value = typeof bytes === "number" ? bytes : Number(bytes);
      if (!Number.isFinite(value) || value <= 0) continue;
      totals.set(language, (totals.get(language) ?? 0) + value);
    }
  }
  return Array.from(totals.entries())
    .map(([language, bytes]) => ({ language, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
}

function computeRecentActivity(records, { limit: max = 10 } = {}) {
  const enriched = records
    .filter((record) => Boolean(record.meta?.pushedAt))
    .map((record) => ({
      repository: record.repository,
      pushedAt: record.meta.pushedAt,
      stars: record.meta.stargazers ?? 0,
      defaultBranch: record.meta.defaultBranch,
      latestRelease: record.release?.tagName,
    }));
  enriched.sort((a, b) => {
    const timeA = Date.parse(a.pushedAt ?? "");
    const timeB = Date.parse(b.pushedAt ?? "");
    return timeB - timeA;
  });
  return max ? enriched.slice(0, max) : enriched;
}

function serialize(records, errors = []) {
  if (outputFormat === "jsonl") {
    return records.map((record) => JSON.stringify(record)).join("\n");
  }
  const payload = {
    fetchedAt: new Date().toISOString(),
    org: values.org,
    repositoryCount: records.length,
    languages: aggregateLanguages(records),
    recent: computeRecentActivity(records),
    repositories: records,
    errors,
  };
  if (outputFormat === "pretty") {
    return JSON.stringify(payload, null, 2);
  }
  return JSON.stringify(payload);
}

async function main() {
  const orgRepos = await fetchAllOrgRepos(values.org);
  const targets = selectRepos(orgRepos, values.repo);
  const results = [];
  const errors = [];

  for (const target of targets) {
    const key = `${target.owner}/${target.name}`;
    try {
      const meta = target.defaultBranch
        ? target
        : await fetchRepo(target.owner, target.name);
      const latestMeta = normaliseRepoEntry(meta);
      if (!latestMeta) {
        throw new Error("Repository metadata missing owner/name");
      }
      const languages = await fetchLanguages(target.owner, target.name);
      const release = await fetchLatestRelease(target.owner, target.name);
      results.push({
        repository: key,
        meta: latestMeta,
        languages,
        release,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ repository: key, error: message });
      console.error(`Failed to fetch ${key}: ${message}`);
    }
    await delay(throttleMs);
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(
      "All repository requests failed; inspect logs above for details.",
    );
  }

  const serialized = serialize(results, errors);
  console.log(serialized);

  if (values.output) {
    await writeFile(values.output, `${serialized}\n`, "utf8");
    console.error(`Wrote snapshot to ${values.output}`);
  }

  if (errors.length > 0) {
    console.error(`Completed with ${errors.length} error(s).`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
