import { Buffer } from "node:buffer";

export function toShareId(shareLink: string): string {
  const base64 = Buffer.from(shareLink, "utf-8").toString("base64");
  const base64Url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/u,
    "",
  );
  return `u!${base64Url}`;
}

export interface FetchDriveItemOptions {
  shareLink: string;
  accessToken: string;
  query?: Record<string, string | undefined>;
}

export async function fetchDriveItem({
  shareLink,
  accessToken,
  query,
}: FetchDriveItemOptions): Promise<unknown> {
  const shareId = toShareId(shareLink);
  const url = new URL(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`,
  );

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

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

  return response.json();
}
