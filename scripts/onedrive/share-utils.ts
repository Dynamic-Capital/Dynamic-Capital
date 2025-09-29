import { Buffer } from "node:buffer";

export interface GraphDriveItem {
  id?: string;
  name?: string;
  size?: number;
  webUrl?: string | null;
  lastModifiedDateTime?: string | null;
  createdDateTime?: string | null;
  file?: {
    mimeType?: string | null;
  } | null;
  folder?: {
    childCount?: number | null;
  } | null;
  parentReference?: {
    id?: string | null;
    path?: string | null;
    driveId?: string | null;
  } | null;
  children?: GraphDriveItem[];
  [key: string]: unknown;
}

export interface GraphDriveItemCollection {
  value?: GraphDriveItem[];
  "@odata.nextLink"?: string | null;
  "@odata.deltaLink"?: string | null;
}

export function toShareId(shareLink: string): string {
  const base64 = Buffer.from(shareLink, "utf-8").toString("base64");
  const base64Url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/u,
    "",
  );
  return `u!${base64Url}`;
}

function buildUrl(
  base: string,
  query?: Record<string, string | undefined>,
) {
  const url = new URL(base);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url;
}

async function graphGet(
  url: URL,
  accessToken: string,
): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Microsoft Graph request failed with ${response.status} ${response.statusText}: ${body}`,
    );
  }

  return response;
}

export async function fetchDriveItemCollectionByUrl(
  nextLink: string,
  accessToken: string,
): Promise<GraphDriveItemCollection> {
  const url = new URL(nextLink);
  const response = await graphGet(url, accessToken);
  return await response.json() as GraphDriveItemCollection;
}

export interface FetchDriveItemOptions {
  shareLink: string;
  accessToken: string;
  query?: Record<string, string | undefined>;
}

export async function fetchDriveItem<T = unknown>({
  shareLink,
  accessToken,
  query,
}: FetchDriveItemOptions): Promise<T> {
  const shareId = toShareId(shareLink);
  const url = buildUrl(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`,
    query,
  );

  const response = await graphGet(url, accessToken);
  return await response.json() as T;
}

export interface FetchDriveItemChildrenOptions {
  driveId: string;
  itemId: string;
  accessToken: string;
  query?: Record<string, string | undefined>;
}

export async function fetchDriveItemChildren({
  driveId,
  itemId,
  accessToken,
  query,
}: FetchDriveItemChildrenOptions): Promise<GraphDriveItemCollection> {
  const url = buildUrl(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/children`,
    query,
  );

  const response = await graphGet(url, accessToken);
  return await response.json() as GraphDriveItemCollection;
}
