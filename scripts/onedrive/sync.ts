import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import process from "node:process";

import {
  fetchDriveItem,
  fetchDriveItemCollectionByUrl,
  type GraphDriveItem,
  type GraphDriveItemCollection,
} from "./share-utils.ts";

interface SyncOptions {
  shareLink: string;
  destination: string;
  accessToken: string;
  metadataOnly: boolean;
  dryRun: boolean;
}

interface SyncEntry {
  remotePath: string;
  localPath: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: string;
  downloaded: boolean;
}

interface SyncContext extends SyncOptions {
  driveId: string;
  baseRemotePath: string;
  entries: SyncEntry[];
}

function parseArgs(argv: string[]): SyncOptions {
  if (!argv.length) {
    throw new Error(
      "Usage: sync.ts <share-link> [--dest <dir>] [--metadata-only] [--dry-run]",
    );
  }

  let shareLink = "";
  let destination = "data/knowledge_base";
  let metadataOnly = false;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dest" || value === "-d") {
      const next = argv[index + 1];
      if (!next) throw new Error("--dest flag requires a directory path");
      destination = next;
      index += 1;
      continue;
    }
    if (value === "--metadata-only") {
      metadataOnly = true;
      continue;
    }
    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
    if (!shareLink) {
      shareLink = value;
    }
  }

  if (!shareLink) {
    throw new Error("Provide the OneDrive sharing link to sync");
  }

  const accessToken = process.env.ONEDRIVE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Set ONEDRIVE_ACCESS_TOKEN before running the sync");
  }

  return {
    shareLink,
    destination: resolve(destination),
    accessToken,
    metadataOnly,
    dryRun,
  };
}

function normaliseRemotePath(item: GraphDriveItem): string {
  const parentPath = typeof item.parentReference?.path === "string"
    ? item.parentReference.path.replace(/^\/drive\/root:/, "").replace(
      /^\/+/,
      "",
    )
    : "";
  const name = item.name ?? item.id ?? "";
  const fullPath = parentPath ? `${parentPath}/${name}` : name;
  return fullPath.replace(/^\/+/, "");
}

function resolveDriveId(item: GraphDriveItem): string | undefined {
  if (typeof item.parentReference?.driveId === "string") {
    return item.parentReference.driveId;
  }
  const remoteItem =
    (item as { remoteItem?: GraphDriveItem | undefined }).remoteItem;
  if (remoteItem && typeof remoteItem.parentReference?.driveId === "string") {
    return remoteItem.parentReference.driveId;
  }
  return undefined;
}

function toRelativeRemotePath(
  remotePath: string,
  baseRemotePath: string,
): string {
  if (!baseRemotePath) {
    return remotePath;
  }
  if (remotePath.startsWith(baseRemotePath)) {
    const trimmed = remotePath.slice(baseRemotePath.length).replace(/^\/+/, "");
    return trimmed;
  }
  return remotePath;
}

async function downloadFile(
  driveId: string,
  itemId: string,
  accessToken: string,
): Promise<Buffer> {
  const url = new URL(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
  );
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to download ${itemId}: ${response.status} ${response.statusText} ${body}`,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function listChildren(
  context: SyncContext,
  item: GraphDriveItem,
): Promise<GraphDriveItem[]> {
  const children: GraphDriveItem[] = [];
  if (Array.isArray(item.children)) {
    children.push(...item.children);
  }

  let nextLink: string | null | undefined = item["children@odata.nextLink"];
  while (nextLink) {
    const collection: GraphDriveItemCollection =
      await fetchDriveItemCollectionByUrl(
        nextLink,
        context.accessToken,
      );
    if (Array.isArray(collection.value)) {
      children.push(...collection.value);
    }
    nextLink = collection["@odata.nextLink"];
  }

  return children;
}

async function syncItem(
  context: SyncContext,
  item: GraphDriveItem,
): Promise<void> {
  const remotePath = normaliseRemotePath(item);
  const relativeRemote = toRelativeRemotePath(
    remotePath,
    context.baseRemotePath,
  );
  const localPath = relativeRemote
    ? join(context.destination, relativeRemote)
    : context.destination;

  const entry: SyncEntry = {
    remotePath,
    localPath,
    type: item.folder ? "folder" : "file",
    size: item.size ?? undefined,
    lastModified: item.lastModifiedDateTime ?? undefined,
    downloaded: false,
  };
  context.entries.push(entry);

  if (item.folder) {
    if (!context.dryRun) {
      await mkdir(localPath, { recursive: true });
    }
    const children = await listChildren(context, item);
    for (const child of children) {
      const childDriveId = resolveDriveId(child) ?? context.driveId;
      await syncItem({ ...context, driveId: childDriveId }, child);
    }
    return;
  }

  if (!item.file) {
    return;
  }

  if (context.metadataOnly) {
    return;
  }

  if (!context.dryRun) {
    await mkdir(dirname(localPath), { recursive: true });
    const driveId = resolveDriveId(item) ?? context.driveId;
    const buffer = await downloadFile(
      driveId,
      item.id ?? basename(localPath),
      context.accessToken,
    );
    await writeFile(localPath, buffer);
    entry.downloaded = true;
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const rootItem = await fetchDriveItem<GraphDriveItem>({
    shareLink: options.shareLink,
    accessToken: options.accessToken,
    query: { expand: "children" },
  });

  const driveId = resolveDriveId(rootItem);
  if (!driveId) {
    throw new Error("Unable to determine driveId for the shared item");
  }

  const baseRemotePath = normaliseRemotePath(rootItem);
  const context: SyncContext = {
    ...options,
    driveId,
    baseRemotePath,
    entries: [],
  };

  if (!options.dryRun) {
    await mkdir(options.destination, { recursive: true });
  }

  if (rootItem.folder) {
    const children = await listChildren(context, rootItem);
    for (const child of children) {
      const childDriveId = resolveDriveId(child) ?? driveId;
      await syncItem({ ...context, driveId: childDriveId }, child);
    }
  } else {
    await syncItem(context, rootItem);
  }

  const manifestPath = join(options.destination, "onedrive-manifest.json");
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: options.shareLink,
    metadataOnly: options.metadataOnly,
    entries: context.entries.map((entry) => ({
      ...entry,
      relativePath: relative(options.destination, entry.localPath) || ".",
    })),
  };

  if (!options.dryRun) {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  console.log(
    `Synced ${context.entries.length} item${
      context.entries.length === 1 ? "" : "s"
    } from OneDrive into ${options.destination}`,
  );
  if (options.metadataOnly) {
    console.log("Run again without --metadata-only to download file contents.");
  }
}

main().catch((error) => {
  console.error("[sync:onedrive] Synchronisation failed");
  console.error(error);
  process.exitCode = 1;
});
