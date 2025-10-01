import { test } from "@playwright/test";
import fs from "fs";

const viewports = [
  { width: 1280, height: 800, name: "desktop" },
  { width: 800, height: 600, name: "tablet" },
  { width: 375, height: 667, name: "phone" },
];

const url = process.env.PREVIEW_URL || "http://localhost:3000";

fs.mkdirSync("screenshots", { recursive: true });

for (const vp of viewports) {
  test(`screenshot ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(url);
    await page.screenshot({
      path: `screenshots/${vp.name}.png`,
      fullPage: true,
    });
  });
}
