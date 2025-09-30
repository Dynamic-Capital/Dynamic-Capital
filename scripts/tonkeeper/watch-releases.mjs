import { request } from "node:https";
import { URL } from "node:url";

const repos = [
  { owner: "tonkeeper", name: "tonkeeper-web", monitorReleases: true },
  { owner: "tonkeeper", name: "wallet-api", monitorReleases: true },
  { owner: "tonkeeper", name: "ton-connect", monitorReleases: true },
  { owner: "tonkeeper", name: "ton-assets", monitorReleases: false },
  { owner: "tonkeeper", name: "ton-console", monitorReleases: false },
];

const GITHUB_API = "https://api.github.com";

function fetchJson(url) {
  const target = new URL(url);

  return new Promise((resolve, reject) => {
    const req = request({
      hostname: target.hostname,
      path: `${target.pathname}${target.search}`,
      method: "GET",
      protocol: target.protocol,
      family: 4,
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "dynamic-capital-tonkeeper-monitor",
      },
    }, (res) => {
      const chunks = [];

      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(
            new Error(`GitHub request failed for ${url}: ${res.statusCode}`),
          );
        }
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
  const latest = releases[0];
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

for (const repo of repos) {
  const { owner, name } = repo;
  const meta = await getRepoMeta(owner, name);
  const latestRelease = repo.monitorReleases
    ? await getLatestRelease(owner, name)
    : null;

  const summary = {
    repository: `${owner}/${name}`,
    branch: meta.default_branch,
    lastPush: meta.pushed_at,
  };

  if (latestRelease) {
    summary.latestRelease = latestRelease;
  }

  console.log(JSON.stringify(summary));
}
