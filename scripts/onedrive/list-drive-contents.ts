import process from "node:process";

import {
  fetchDriveItem,
  fetchDriveItemChildren,
  fetchDriveItemCollectionByUrl,
  type GraphDriveItem,
} from "./share-utils.ts";

const { env, argv } = process;

interface CliOptions {
  recursive: boolean;
}

interface ParsedArgs {
  shareLink?: string;
  options: CliOptions;
}

function parseArgs(): ParsedArgs {
  const args = argv.slice(2);
  const options: CliOptions = { recursive: false };
  const positional: string[] = [];

  for (const arg of args) {
    if (arg === "--recursive" || arg === "-r") {
      options.recursive = true;
      continue;
    }
    positional.push(arg);
  }

  return { shareLink: positional[0], options };
}

function ensureAccessToken(): string {
  const token = env.ONEDRIVE_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "Set the ONEDRIVE_ACCESS_TOKEN environment variable before running this script.",
    );
    process.exit(1);
  }
  return token;
}

function formatSize(size?: number | null): string | undefined {
  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
    return undefined;
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatIsoDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function describeItem(item: GraphDriveItem): string {
  const label = item.name ?? "(unnamed)";
  const details: string[] = [];

  if (item.folder) {
    details.push("folder");
    if (typeof item.folder.childCount === "number") {
      details.push(`${item.folder.childCount} items`);
    }
  } else {
    details.push("file");
    const size = formatSize(item.size);
    if (size) details.push(size);
    const mime = item.file?.mimeType ?? undefined;
    if (mime) details.push(mime);
  }

  const modified = formatIsoDate(item.lastModifiedDateTime);
  if (modified) details.push(`modified ${modified}`);

  const summary = details.length > 0 ? ` (${details.join(", ")})` : "";
  const link = typeof item.webUrl === "string" ? ` — ${item.webUrl}` : "";
  return `${label}${summary}${link}`;
}

function sortChildren(children: GraphDriveItem[]): GraphDriveItem[] {
  return [...children].sort((a, b) => {
    const aFolder = Boolean(a.folder);
    const bFolder = Boolean(b.folder);
    if (aFolder !== bFolder) {
      return aFolder ? -1 : 1;
    }
    const nameA = (a.name ?? "").toLocaleLowerCase();
    const nameB = (b.name ?? "").toLocaleLowerCase();
    return nameA.localeCompare(nameB);
  });
}

async function ensureChildren(
  item: GraphDriveItem,
  accessToken: string,
  fallbackDriveId: string | null,
  visited: Set<string>,
): Promise<GraphDriveItem[]> {
  const existing = Array.isArray(item.children) ? item.children : [];
  if (!item.folder || !item.id) {
    item.children = existing;
    return existing;
  }

  const driveId = item.parentReference?.driveId ?? fallbackDriveId;
  if (!driveId) {
    item.children = existing;
    return existing;
  }

  const cacheKey = `${driveId}:${item.id}`;
  if (visited.has(cacheKey)) {
    return Array.isArray(item.children) ? item.children : existing;
  }
  visited.add(cacheKey);

  const children: GraphDriveItem[] = [...existing];
  let nextLink: string | null =
    typeof item["children@odata.nextLink"] === "string"
      ? item["children@odata.nextLink"] as string
      : null;

  if (children.length === 0) {
    const response = await fetchDriveItemChildren({
      driveId,
      itemId: item.id,
      accessToken,
    });

    if (Array.isArray(response.value)) {
      children.push(...response.value);
    }

    if (!nextLink && typeof response["@odata.nextLink"] === "string") {
      nextLink = response["@odata.nextLink"] as string;
    }
  }

  while (nextLink) {
    const page = await fetchDriveItemCollectionByUrl(nextLink, accessToken);
    if (Array.isArray(page.value)) {
      children.push(...page.value);
    }
    nextLink = typeof page["@odata.nextLink"] === "string"
      ? page["@odata.nextLink"] as string
      : null;
  }

  item.children = children;
  return children;
}

async function expandRecursively(
  item: GraphDriveItem,
  accessToken: string,
  fallbackDriveId: string | null,
  visited: Set<string>,
): Promise<void> {
  const children = await ensureChildren(
    item,
    accessToken,
    fallbackDriveId,
    visited,
  );
  for (const child of children) {
    if (child.folder) {
      const nextFallback = child.parentReference?.driveId ?? fallbackDriveId;
      await expandRecursively(child, accessToken, nextFallback, visited);
    }
  }
}

function printSubtree(
  item: GraphDriveItem,
  prefix: string,
  isLast: boolean,
): void {
  const branch = `${prefix}${isLast ? "└── " : "├── "}`;
  console.log(`${branch}${describeItem(item)}`);
  const childPrefix = `${prefix}${isLast ? "    " : "│   "}`;
  const children = sortChildren(
    Array.isArray(item.children) ? item.children : [],
  );
  children.forEach((child, index) => {
    printSubtree(child, childPrefix, index === children.length - 1);
  });
}

async function main() {
  const { shareLink, options } = parseArgs();

  if (!shareLink) {
    console.error(
      "Usage: tsx scripts/onedrive/list-drive-contents.ts <share-link> [--recursive]",
    );
    process.exit(1);
  }

  const accessToken = ensureAccessToken();

  try {
    const root = await fetchDriveItem<GraphDriveItem>({
      shareLink,
      accessToken,
      query: { expand: "children" },
    });

    const rootChildren = Array.isArray(root.children) ? root.children : [];
    root.children = rootChildren;

    const visited = new Set<string>();
    const fallbackDriveId = root.parentReference?.driveId ?? null;
    await ensureChildren(root, accessToken, fallbackDriveId, visited);

    if (options.recursive) {
      await expandRecursively(root, accessToken, fallbackDriveId, visited);
    }

    console.log(describeItem(root));
    const children = sortChildren(root.children ?? []);
    children.forEach((child, index) => {
      printSubtree(child, "", index === children.length - 1);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

await main();
