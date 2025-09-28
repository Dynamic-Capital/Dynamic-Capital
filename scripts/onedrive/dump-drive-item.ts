import { writeFile } from "node:fs/promises";
import process from "node:process";

import { fetchDriveItem } from "./share-utils.ts";

const { env, argv } = process;

async function main() {
  const [, , shareLink, outputPath] = argv;

  if (!shareLink || !outputPath) {
    console.error(
      "Usage: tsx scripts/onedrive/dump-drive-item.ts <share-link> <output-path> [expand-children]",
    );
    process.exit(1);
  }

  const expandChildren = argv[4] !== "false";

  const accessToken = env.ONEDRIVE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error(
      "Set the ONEDRIVE_ACCESS_TOKEN environment variable before running this script.",
    );
    process.exit(1);
  }

  try {
    const driveItem = await fetchDriveItem({
      shareLink,
      accessToken,
      query: expandChildren ? { expand: "children" } : undefined,
    });

    await writeFile(outputPath, `${JSON.stringify(driveItem, null, 2)}\n`);
    console.log(`Wrote metadata to ${outputPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

await main();
