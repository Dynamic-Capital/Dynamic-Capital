import { Buffer } from "node:buffer";
import process from "node:process";

const { env, argv } = process;

function toShareId(shareLink: string): string {
  const base64 = Buffer.from(shareLink, "utf-8").toString("base64");
  const base64Url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/u,
    "",
  );
  return `u!${base64Url}`;
}

async function fetchDriveItem(shareLink: string, accessToken: string) {
  const shareId = toShareId(shareLink);
  const url = `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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

async function main() {
  const [, , shareLink] = argv;

  if (!shareLink) {
    console.error(
      "Usage: tsx scripts/onedrive/fetch-drive-item.ts <share-link>",
    );
    process.exit(1);
  }

  const accessToken = env.ONEDRIVE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error(
      "Set the ONEDRIVE_ACCESS_TOKEN environment variable before running this script.",
    );
    process.exit(1);
  }

  try {
    const driveItem = await fetchDriveItem(shareLink, accessToken);
    console.log(JSON.stringify(driveItem, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

await main();
