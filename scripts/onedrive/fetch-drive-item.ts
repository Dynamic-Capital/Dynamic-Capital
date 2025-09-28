import process from "node:process";

import { fetchDriveItem } from "./share-utils.ts";

const { env, argv } = process;

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
    const driveItem = await fetchDriveItem({ shareLink, accessToken });
    console.log(JSON.stringify(driveItem, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

await main();
