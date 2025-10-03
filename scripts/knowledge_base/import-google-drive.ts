import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import {
  type KnowledgeBaseCollection,
  knowledgeBaseCollections,
  knowledgeBaseDocuments,
  type NewKnowledgeBaseCollection,
  type NewKnowledgeBaseDocument,
} from "../../db/schema.js";
import { extractPdf, normaliseWhitespace } from "./pdf.js";

loadEnv();

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const PDF_MIME_TYPE = "application/pdf";

type DriveTarget = { type: "folder" | "file"; id: string };

type DriveCredentials = {
  apiKey?: string;
  accessToken?: string;
};

type DriveFileMetadata = {
  id: string;
  name?: string;
  mimeType?: string;
  modifiedTime?: string;
  size?: string;
  md5Checksum?: string;
  webViewLink?: string;
  parents?: string[];
};

type CliOptions = {
  shareLink: string;
  folderId?: string;
  fileIds: string[];
  apiKey?: string;
  accessToken?: string;
  limit?: number;
  maxFileSize?: number;
  collectionSlug?: string;
  collectionTitle?: string;
  collectionDescription?: string;
  sourceLink?: string;
  tags: string[];
  replaceExisting: boolean;
  dryRun: boolean;
};

type DocumentIngestionResult = {
  identifier: string;
  inserted: boolean;
  updated: boolean;
};

function parseDriveShareLink(link: string): DriveTarget {
  const candidate = (link ?? "").trim();
  if (!candidate) {
    throw new Error("Google Drive share link must not be empty");
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch (error) {
    throw new Error(
      `Invalid Google Drive share link '${link}': ${(error as Error).message}`,
    );
  }

  const folderMatch = /\/folders\/([A-Za-z0-9_-]+)/u.exec(parsed.pathname);
  if (folderMatch) {
    return { type: "folder", id: folderMatch[1] ?? "" };
  }

  const fileMatch = /\/file\/d\/([A-Za-z0-9_-]+)/u.exec(parsed.pathname);
  if (fileMatch) {
    return { type: "file", id: fileMatch[1] ?? "" };
  }

  const idParam = parsed.searchParams.get("id");
  if (idParam) {
    return { type: "file", id: idParam };
  }

  throw new Error(
    "Unable to extract a file or folder identifier from share link",
  );
}

function toSlug(value: string): string {
  const cleaned = normaliseWhitespace(value).toLowerCase();
  const slug = cleaned
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96);
  return slug || `drive-${Date.now()}`;
}

function ensureUniqueTags(
  ...groups: (string | undefined | null)[][]
): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const group of groups) {
    for (const candidate of group) {
      const tag = (candidate ?? "").trim().toLowerCase();
      if (!tag || seen.has(tag)) {
        continue;
      }
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    shareLink: "",
    fileIds: [],
    tags: [],
    replaceExisting: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    switch (arg) {
      case "--share-link":
        options.shareLink = argv[++index] ?? "";
        break;
      case "--folder-id":
        options.folderId = argv[++index];
        break;
      case "--file-id":
        options.fileIds.push(argv[++index] ?? "");
        break;
      case "--api-key":
        options.apiKey = argv[++index];
        break;
      case "--access-token":
        options.accessToken = argv[++index];
        break;
      case "--limit":
        options.limit = Number.parseInt(argv[++index] ?? "", 10);
        break;
      case "--max-file-size":
        options.maxFileSize = Number.parseInt(argv[++index] ?? "", 10);
        break;
      case "--collection-slug":
        options.collectionSlug = argv[++index];
        break;
      case "--collection-title":
        options.collectionTitle = argv[++index];
        break;
      case "--collection-description":
        options.collectionDescription = argv[++index];
        break;
      case "--source-link":
        options.sourceLink = argv[++index];
        break;
      case "--tag":
        options.tags.push(argv[++index] ?? "");
        break;
      case "--replace":
        options.replaceExisting = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        if (!arg.startsWith("--") && !options.shareLink) {
          options.shareLink = arg;
        }
        break;
    }
  }

  if (!options.shareLink && !options.folderId && options.fileIds.length === 0) {
    throw new Error(
      "Provide a --share-link, --folder-id, or at least one --file-id argument.",
    );
  }

  return options;
}

function resolveCredentials(options: CliOptions): DriveCredentials {
  const apiKey = (options.apiKey ?? process.env.GOOGLE_API_KEY ?? "").trim();
  const accessToken =
    (options.accessToken ?? process.env.GOOGLE_ACCESS_TOKEN ?? "").trim();

  if (!apiKey && !accessToken) {
    throw new Error(
      "Google Drive credentials missing. Supply --api-key/--access-token or set GOOGLE_API_KEY/GOOGLE_ACCESS_TOKEN env vars.",
    );
  }

  return {
    apiKey: apiKey || undefined,
    accessToken: accessToken || undefined,
  };
}

function buildDriveUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): URL {
  const url = new URL(`${DRIVE_API_BASE}/${path.replace(/^\/+/, "")}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function driveRequest(
  path: string,
  credentials: DriveCredentials,
  {
    params,
    accept = "application/json",
    responseType = "json",
  }: {
    params?: Record<string, string | number | undefined>;
    accept?: string;
    responseType?: "json" | "buffer";
  } = {},
): Promise<unknown> {
  const url = buildDriveUrl(path, params);
  if (credentials.apiKey) {
    url.searchParams.set("key", credentials.apiKey);
  }

  const headers: Record<string, string> = { Accept: accept };
  if (credentials.accessToken) {
    headers.Authorization = `Bearer ${credentials.accessToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Google Drive request to ${url.toString()} failed with ${response.status} ${response.statusText}: ${body}`,
    );
  }

  if (responseType === "buffer") {
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return response.json() as Promise<unknown>;
}

async function getFileMetadata(
  fileId: string,
  credentials: DriveCredentials,
  fields =
    "id, name, mimeType, modifiedTime, size, md5Checksum, webViewLink, parents",
): Promise<DriveFileMetadata> {
  const payload = await driveRequest(
    `files/${fileId}`,
    credentials,
    {
      params: {
        supportsAllDrives: "true",
        fields,
      },
    },
  ) as Record<string, unknown>;

  return payload as DriveFileMetadata;
}

async function listFolderPdfs(
  folderId: string,
  credentials: DriveCredentials,
  limit?: number,
): Promise<DriveFileMetadata[]> {
  const files: DriveFileMetadata[] = [];
  let nextPageToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and trashed = false and mimeType = '${PDF_MIME_TYPE}'`,
      pageSize: "200",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      fields:
        "nextPageToken, files(id, name, mimeType, modifiedTime, size, md5Checksum, webViewLink, parents)",
    };

    if (nextPageToken) {
      params.pageToken = nextPageToken;
    }

    const payload = await driveRequest("files", credentials, {
      params,
    }) as Record<string, unknown>;
    const batch = Array.isArray(payload.files)
      ? payload.files as DriveFileMetadata[]
      : [];

    for (const entry of batch) {
      files.push(entry);
      if (limit && files.length >= limit) {
        return files;
      }
    }

    nextPageToken = typeof payload.nextPageToken === "string"
      ? payload.nextPageToken
      : undefined;

    if (!nextPageToken) {
      break;
    }
  }

  return files;
}

async function downloadPdf(
  fileId: string,
  credentials: DriveCredentials,
): Promise<Buffer> {
  const payload = await driveRequest(
    `files/${fileId}`,
    credentials,
    {
      params: {
        alt: "media",
        supportsAllDrives: "true",
      },
      accept: "application/pdf, */*;q=0.8",
      responseType: "buffer",
    },
  );

  if (!Buffer.isBuffer(payload)) {
    throw new Error(`Expected PDF download for '${fileId}' to return a buffer`);
  }

  return payload;
}

async function ensureCollection(
  values: NewKnowledgeBaseCollection,
  dryRun: boolean,
): Promise<KnowledgeBaseCollection> {
  const [existing] = await db.select()
    .from(knowledgeBaseCollections)
    .where(eq(knowledgeBaseCollections.slug, values.slug))
    .limit(1);

  if (existing) {
    if (dryRun) {
      return existing;
    }

    const updatedAt = new Date();
    await db.update(knowledgeBaseCollections)
      .set({
        title: values.title,
        description: values.description,
        sourceLink: values.sourceLink,
        metadata: values.metadata,
        updatedAt,
      })
      .where(eq(knowledgeBaseCollections.id, existing.id));

    return {
      ...existing,
      title: values.title,
      description: values.description,
      sourceLink: values.sourceLink,
      metadata: values.metadata,
      updatedAt,
    } satisfies KnowledgeBaseCollection;
  }

  if (dryRun) {
    return {
      ...values,
      id: "00000000-0000-0000-0000-000000000000",
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies KnowledgeBaseCollection;
  }

  const [inserted] = await db.insert(knowledgeBaseCollections)
    .values(values)
    .returning();

  if (!inserted) {
    throw new Error("Failed to insert knowledge base collection");
  }

  return inserted;
}

async function upsertDocument(
  document: NewKnowledgeBaseDocument,
  dryRun: boolean,
): Promise<DocumentIngestionResult> {
  const [existing] = await db.select()
    .from(knowledgeBaseDocuments)
    .where(and(
      eq(knowledgeBaseDocuments.collectionId, document.collectionId),
      eq(knowledgeBaseDocuments.identifier, document.identifier),
    ))
    .limit(1);

  if (!existing) {
    if (dryRun) {
      return {
        identifier: document.identifier,
        inserted: true,
        updated: false,
      };
    }

    await db.insert(knowledgeBaseDocuments).values(document);
    return { identifier: document.identifier, inserted: true, updated: false };
  }

  const hasChanges = existing.content !== document.content ||
    existing.checksum !== document.checksum ||
    existing.pageCount !== document.pageCount;

  if (
    !hasChanges &&
    JSON.stringify(existing.metadata) === JSON.stringify(document.metadata)
  ) {
    return { identifier: document.identifier, inserted: false, updated: false };
  }

  if (dryRun) {
    return { identifier: document.identifier, inserted: false, updated: true };
  }

  await db.update(knowledgeBaseDocuments)
    .set({
      title: document.title,
      content: document.content,
      metadata: document.metadata,
      tags: document.tags,
      checksum: document.checksum,
      pageCount: document.pageCount,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeBaseDocuments.id, existing.id));

  return { identifier: document.identifier, inserted: false, updated: true };
}

async function ingestDocuments(
  files: DriveFileMetadata[],
  collection: KnowledgeBaseCollection,
  credentials: DriveCredentials,
  options: CliOptions,
): Promise<DocumentIngestionResult[]> {
  const limit = options.limit ?? files.length;
  const trimmedFiles = files.slice(0, limit);
  const results: DocumentIngestionResult[] = [];
  const maxSize = options.maxFileSize ?? 50_000_000;
  const baseTags = ensureUniqueTags(["google_drive", "pdf"], options.tags);

  if (!options.dryRun && options.replaceExisting) {
    await db.delete(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.collectionId, collection.id));
  }

  for (const file of trimmedFiles) {
    const fileId = (file.id ?? "").trim();
    if (!fileId) {
      console.warn("Skipping entry without an id", file);
      continue;
    }

    const mime = (file.mimeType ?? "").trim();
    if (mime && mime !== PDF_MIME_TYPE) {
      console.warn(`Skipping '${fileId}' because mimeType is '${mime}'`);
      continue;
    }

    const size = file.size ? Number.parseInt(file.size, 10) : undefined;
    if (size && maxSize && size > maxSize) {
      console.warn(
        `Skipping '${fileId}' because size ${size.toLocaleString()} exceeds limit ${maxSize.toLocaleString()}`,
      );
      continue;
    }

    try {
      const buffer = await downloadPdf(fileId, credentials);
      const checksum = createHash("sha256").update(buffer).digest("hex");
      const extracted = await extractPdf(buffer);
      const text = normaliseWhitespace(extracted.text ?? "");
      if (!text) {
        console.warn(`No extractable text found in '${file.name ?? fileId}'`);
        continue;
      }

      const metadata: Record<string, unknown> = {
        driveId: fileId,
        name: file.name,
        mimeType: mime || undefined,
        modifiedTime: file.modifiedTime,
        size,
        md5Checksum: file.md5Checksum,
        webViewLink: file.webViewLink,
        parents: file.parents,
        shareLink: options.shareLink,
        extractedAt: new Date().toISOString(),
        extraction: {
          numPages: extracted.numPages,
          version: extracted.version,
          info: extracted.info,
          metadata: extracted.metadata,
        },
      };

      const document: NewKnowledgeBaseDocument = {
        collectionId: collection.id,
        identifier: `google-drive-${fileId}`,
        title: file.name ?? `Drive PDF ${fileId}`,
        content: extracted.pageTexts.length > 0
          ? extracted.pageTexts.join("\n\n")
          : text,
        source: "google_drive",
        metadata,
        tags: baseTags,
        checksum,
        pageCount: extracted.numPages,
      };

      const result = await upsertDocument(document, options.dryRun);
      results.push(result);
      if (result.inserted) {
        console.log(`Indexed '${document.identifier}' (${document.title})`);
      } else if (result.updated) {
        console.log(`Updated '${document.identifier}' (${document.title})`);
      } else {
        console.log(
          `No changes for '${document.identifier}' (${document.title})`,
        );
      }
    } catch (error) {
      console.error(
        `Failed to ingest '${file.name ?? fileId}': ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  return results;
}

async function resolveSourceFiles(
  options: CliOptions,
  credentials: DriveCredentials,
): Promise<{ files: DriveFileMetadata[]; target: DriveTarget }> {
  let target: DriveTarget | undefined;
  if (options.shareLink) {
    target = parseDriveShareLink(options.shareLink);
  }

  if (options.folderId) {
    if (target && target.type !== "folder" && target.id !== options.folderId) {
      throw new Error("Conflicting folder identifiers provided");
    }
    target = { type: "folder", id: options.folderId };
  }

  const fileIds = options.fileIds
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const files: DriveFileMetadata[] = [];

  if (target?.type === "folder") {
    const folderFiles = await listFolderPdfs(
      target.id,
      credentials,
      options.limit,
    );
    files.push(...folderFiles);
  }

  const explicitIds = target?.type === "file"
    ? [...fileIds, target.id]
    : fileIds;

  for (const fileId of explicitIds) {
    const metadata = await getFileMetadata(fileId, credentials);
    files.push(metadata);
  }

  if (!target) {
    if (files.length === 0) {
      throw new Error("No files resolved from the provided arguments");
    }
    target = { type: "file", id: files[0]?.id ?? "" };
  }

  const seen = new Set<string>();
  const uniqueFiles = files.filter((file) => {
    const id = (file.id ?? "").trim();
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });

  return { files: uniqueFiles, target };
}

async function resolveCollection(
  options: CliOptions,
  target: DriveTarget,
  credentials: DriveCredentials,
): Promise<NewKnowledgeBaseCollection> {
  let baseSlug = options.collectionSlug;
  let title = options.collectionTitle;
  let description = options.collectionDescription;
  let sourceLink = options.sourceLink ?? options.shareLink;
  const metadata: Record<string, unknown> = {
    shareLink: options.shareLink,
    folderId: target.type === "folder" ? target.id : undefined,
    fileIds: options.fileIds,
  };

  if (target.type === "folder") {
    const folderMeta = await getFileMetadata(
      target.id,
      credentials,
      "id, name, webViewLink",
    );
    baseSlug ||= folderMeta.name ?? target.id;
    title ||= folderMeta.name ?? `Drive Folder ${target.id}`;
    sourceLink ||= folderMeta.webViewLink ?? sourceLink;
    metadata.folderWebViewLink = folderMeta.webViewLink;
  } else if (!title) {
    const fileMeta = await getFileMetadata(
      target.id,
      credentials,
      "id, name, webViewLink",
    );
    baseSlug ||= fileMeta.name ?? target.id;
    title = fileMeta.name ?? `Drive File ${target.id}`;
    sourceLink ||= fileMeta.webViewLink ?? sourceLink;
  }

  const slug = toSlug(baseSlug ?? `drive-${target.type}-${target.id}`);
  const nowIso = new Date().toISOString();
  metadata.generatedAt = nowIso;

  return {
    slug,
    title: title ?? slug,
    description,
    sourceLink,
    metadata,
  } satisfies NewKnowledgeBaseCollection;
}

async function main() {
  const [, invokedPath, ...argv] = process.argv;
  const cliTarget = typeof invokedPath === "string"
    ? pathToFileURL(invokedPath).href
    : undefined;
  const selfUrl = fileURLToPath(import.meta.url);
  const invokedDirectly = cliTarget === import.meta.url ||
    invokedPath === selfUrl;

  if (!invokedDirectly) {
    return;
  }

  try {
    const options = parseArgs(argv);
    const credentials = resolveCredentials(options);
    const { files, target } = await resolveSourceFiles(options, credentials);
    if (files.length === 0) {
      console.log("No PDF files discovered for ingestion");
      return;
    }

    const collectionValues = await resolveCollection(
      options,
      target,
      credentials,
    );
    const collection = await ensureCollection(collectionValues, options.dryRun);
    console.log(
      `${
        options.dryRun ? "[dry-run] " : ""
      }Preparing to ingest ${files.length} document(s) into collection '${collection.slug}'`,
    );

    const results = await ingestDocuments(
      files,
      collection,
      credentials,
      options,
    );
    const inserted = results.filter((result) => result.inserted).length;
    const updated = results.filter((result) => result.updated).length;
    const skipped = results.length - inserted - updated;

    console.log(
      `${
        options.dryRun ? "[dry-run] " : ""
      }Ingestion summary: ${inserted} inserted, ${updated} updated, ${skipped} unchanged.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await main();
