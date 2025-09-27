import { cp, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "out");
// Output to a project-level directory so deployment tooling can pick it up
const staticDir = join(root, "_static");

async function copyOut() {
  await rm(staticDir, { recursive: true, force: true });
  await cp(outDir, staticDir, { recursive: true });
  console.log(`✅ Copied ${outDir} to ${staticDir}`);
}

copyOut().catch((err) => {
  console.error("❌ Failed to copy static assets:", err);
  process.exit(1);
});
