import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const publicDir = resolve(projectRoot, "apps/web/public");
const sourceIconPath = resolve(publicDir, "icon-mark.svg");

async function ensureParentDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function generatePng(
  svgBuffer: Buffer,
  destination: string,
  size: number,
  description: string,
) {
  await ensureParentDir(destination);
  await sharp(svgBuffer)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(destination);
  console.log(`Generated ${description} at ${destination}`);
}

async function generateFavicon(svgBuffer: Buffer, destination: string) {
  await ensureParentDir(destination);
  const sizes = [16, 32, 48, 64];
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(svgBuffer)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
    ),
  );

  const icoBuffer = await pngToIco(pngBuffers);
  await writeFile(destination, icoBuffer);
  console.log(`Generated favicon at ${destination}`);
}

async function main() {
  const svgBuffer = await readFile(sourceIconPath);

  await Promise.all([
    generatePng(
      svgBuffer,
      resolve(publicDir, "apple-touch-icon.png"),
      180,
      "apple touch icon",
    ),
    generatePng(
      svgBuffer,
      resolve(publicDir, "icon-mark-512.png"),
      512,
      "512px icon",
    ),
    generateFavicon(svgBuffer, resolve(publicDir, "favicon.ico")),
  ]);

  await writeFile(
    resolve(publicDir, ".brand-icons.json"),
    JSON.stringify({ generatedAt: new Date().toISOString() }, null, 2),
    "utf-8",
  );
}

main().catch((error) => {
  console.error("Failed to generate brand icons", error);
  process.exitCode = 1;
});
