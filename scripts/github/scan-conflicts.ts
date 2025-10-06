import process from "node:process";
import { writeFile } from "node:fs/promises";

interface CliOptions {
  repo?: string;
  json?: string;
}

interface PullRequestNode {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
  mergeStateStatus: string;
  headRefName: string;
  baseRefName: string;
  updatedAt: string;
  createdAt: string;
  reviewDecision?: string | null;
  author?: { login: string } | null;
  labels?: { nodes: Array<{ name: string }> };
}

interface PullRequestPage {
  totalCount: number;
  nodes: PullRequestNode[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

interface PullRequestQueryResponse {
  repository: {
    pullRequests: PullRequestPage;
  } | null;
}

interface GraphqlResponse {
  data?: PullRequestQueryResponse;
  errors?: Array<{ message: string }>;
}

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

function printUsage(): void {
  console.log(
    `Usage: tsx scripts/github/scan-conflicts.ts [--repo owner/name] [--json output.json]\n`,
  );
  console.log("Environment variables:");
  console.log(
    "  GITHUB_PAT or GITHUB_TOKEN  Personal access token with repo scope",
  );
  console.log(
    "  GITHUB_REPOSITORY            Default owner/name when --repo omitted\n",
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    if (arg.startsWith("--repo")) {
      const value = arg.includes("=") ? arg.split("=", 2)[1] : argv[++i];
      if (!value) {
        throw new Error("--repo requires a value in owner/name format");
      }
      options.repo = value.trim();
      continue;
    }
    if (arg.startsWith("--json")) {
      const value = arg.includes("=") ? arg.split("=", 2)[1] : argv[++i];
      if (!value) {
        throw new Error("--json requires a path");
      }
      options.json = value.trim();
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function resolveRepo(optionRepo?: string): { owner: string; name: string } {
  const repo = optionRepo ?? process.env.GITHUB_REPOSITORY;
  if (!repo) {
    throw new Error(
      "Repository not provided. Use --repo owner/name or set GITHUB_REPOSITORY.",
    );
  }
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid repository format: ${repo}. Expected owner/name.`);
  }
  return { owner, name };
}

function resolveToken(): string {
  const token = process.env.GITHUB_PAT ?? process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GitHub token. Set GITHUB_PAT or GITHUB_TOKEN.");
  }
  return token;
}

const pullRequestQuery = `
  query($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(states: OPEN, first: 100, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          url
          isDraft
          mergeable
          mergeStateStatus
          headRefName
          baseRefName
          updatedAt
          createdAt
          reviewDecision
          author {
            login
          }
          labels(first: 10) {
            nodes { name }
          }
        }
      }
    }
  }
`;

async function fetchPullRequests(
  owner: string,
  name: string,
  token: string,
): Promise<{ totalCount: number; pullRequests: PullRequestNode[] }> {
  let cursor: string | null = null;
  const pullRequests: PullRequestNode[] = [];
  let totalCount = 0;

  while (true) {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `bearer ${token}`,
        "user-agent": "dynamic-conflict-scanner",
      },
      body: JSON.stringify({
        query: pullRequestQuery,
        variables: { owner, name, cursor },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `GitHub GraphQL request failed with ${response.status}: ${text}`,
      );
    }

    const body = await response.json() as GraphqlResponse;
    if (body.errors && body.errors.length > 0) {
      const message = body.errors.map((error) => error.message).join(", ");
      throw new Error(`GitHub GraphQL error: ${message}`);
    }

    const repository = body.data?.repository;
    if (!repository) {
      throw new Error("Repository not found or access denied.");
    }

    const page = repository.pullRequests;
    totalCount = page.totalCount;
    pullRequests.push(...page.nodes);

    if (!page.pageInfo.hasNextPage) {
      break;
    }
    cursor = page.pageInfo.endCursor;
  }

  return { totalCount, pullRequests };
}

function isConflicting(pr: PullRequestNode): boolean {
  if (pr.mergeable === "CONFLICTING") return true;
  if (pr.mergeStateStatus?.toUpperCase() === "DIRTY") return true;
  return false;
}

function formatRelativeTime(iso: string): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return iso;
  }
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

function formatList(title: string, items: Array<[string, number]>): void {
  if (!items.length) return;
  console.log(`\n${title}:`);
  for (const [key, count] of items) {
    console.log(`  ${key}: ${count}`);
  }
}

async function writeJsonReport(path: string, data: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: "utf8",
  });
  console.log(`\nSaved report to ${path}`);
}

function summariseConflicts(prs: PullRequestNode[]) {
  const byBase = new Map<string, number>();
  const byAuthor = new Map<string, number>();
  for (const pr of prs) {
    byBase.set(pr.baseRefName, (byBase.get(pr.baseRefName) ?? 0) + 1);
    const author = pr.author?.login ?? "unknown";
    byAuthor.set(author, (byAuthor.get(author) ?? 0) + 1);
  }
  const sortDescending = (entries: Map<string, number>) =>
    Array.from(entries.entries()).sort((a, b) => b[1] - a[1]);

  return {
    byBase: sortDescending(byBase),
    byAuthor: sortDescending(byAuthor),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { owner, name } = resolveRepo(options.repo);
  const token = resolveToken();

  console.log(`Scanning pull requests for ${owner}/${name}...`);
  const { totalCount, pullRequests } = await fetchPullRequests(
    owner,
    name,
    token,
  );
  const conflicting = pullRequests.filter(isConflicting);
  const unknown = pullRequests.filter((pr) =>
    pr.mergeable === "UNKNOWN" && pr.mergeStateStatus?.toUpperCase() !== "DIRTY"
  );

  console.log(
    `Total open pull requests: ${pullRequests.length} (GitHub reports ${totalCount})`,
  );
  console.log(`Conflicting pull requests: ${conflicting.length}`);
  console.log(`Unknown mergeability: ${unknown.length}`);

  if (conflicting.length) {
    const summary = summariseConflicts(conflicting);
    formatList("Conflicts by base branch", summary.byBase);
    formatList("Conflicts by author", summary.byAuthor);

    console.log("\nConflict details:");
    for (const pr of conflicting) {
      const labels = pr.labels?.nodes?.map((node) => node.name).join(", ") ??
        "";
      const draftTag = pr.isDraft ? " [draft]" : "";
      const review = pr.reviewDecision ? ` | review: ${pr.reviewDecision}` : "";
      console.log(`- #${pr.number}${draftTag}: ${pr.title}`);
      console.log(`  ${pr.url}`);
      console.log(
        `  ${pr.headRefName} -> ${pr.baseRefName} | mergeable=${pr.mergeable} | mergeState=${pr.mergeStateStatus}${review}`,
      );
      console.log(
        `  updated ${formatRelativeTime(pr.updatedAt)}${
          labels ? ` | labels: ${labels}` : ""
        }`,
      );
    }
  }

  if (unknown.length) {
    console.log("\nPull requests pending mergeability evaluation:");
    for (const pr of unknown) {
      console.log(`- #${pr.number}: ${pr.title} (${pr.url})`);
    }
  }

  if (options.json) {
    const payload = {
      repository: `${owner}/${name}`,
      generatedAt: new Date().toISOString(),
      totals: {
        open: pullRequests.length,
        conflicting: conflicting.length,
        unknown: unknown.length,
      },
      conflicts: conflicting.map((pr) => ({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        isDraft: pr.isDraft,
        mergeable: pr.mergeable,
        mergeStateStatus: pr.mergeStateStatus,
        headRefName: pr.headRefName,
        baseRefName: pr.baseRefName,
        updatedAt: pr.updatedAt,
        author: pr.author?.login ?? null,
        reviewDecision: pr.reviewDecision ?? null,
        labels: pr.labels?.nodes?.map((node) => node.name) ?? [],
      })),
    };
    await writeJsonReport(options.json, payload);
  }
}

main().catch((error) => {
  console.error("Failed to scan pull request conflicts.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
