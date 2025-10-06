import { copy } from "https://deno.land/std@0.224.0/fs/copy.ts";
import { emptyDir } from "https://deno.land/std@0.224.0/fs/empty_dir.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { dirname, join } from "https://deno.land/std@0.224.0/path/mod.ts";

import {
  computeSha256Hex,
  loadProjectConfig,
  readJettonMetadata,
  resolveProjectRoot,
} from "./_shared.ts";

const textDecoder = new TextDecoder();

async function copyPathIntoBundle(
  projectRoot: string,
  stagingDir: string,
  relativePath: string,
) {
  const source = join(projectRoot, relativePath);
  const destination = join(stagingDir, relativePath);
  await ensureDir(dirname(destination));
  await copy(source, destination, { overwrite: true });
}

async function writeFile(
  stagingDir: string,
  relativePath: string,
  contents: string,
) {
  const destination = join(stagingDir, relativePath);
  await ensureDir(dirname(destination));
  await Deno.writeTextFile(destination, contents);
}

async function main() {
  const projectRoot = resolveProjectRoot(import.meta.url);
  const stagingDir = join(projectRoot, "build", "tonviewer", "bundle");
  const outputDir = dirname(stagingDir);
  const zipTarget = join(outputDir, "dct-tonviewer-verification.zip");

  await ensureDir(stagingDir);
  await emptyDir(stagingDir);

  const config = await loadProjectConfig(projectRoot);
  const tokenConfig = config.token ?? {};
  const jettonAddress = typeof tokenConfig.address === "string"
    ? tokenConfig.address
    : "";

  const metadataInfo = await readJettonMetadata(projectRoot);
  const metadata = metadataInfo.json;
  const metadataSha256 = await computeSha256Hex(metadataInfo.bytes);

  const manifest = {
    jettonMasterAddress: jettonAddress,
    metadataSha256,
    metadataPreview: {
      name: metadata.name,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      image: metadata.image,
      external_url: metadata.external_url,
    },
    generatedAt: new Date().toISOString(),
    instructions: [
      "Upload this archive to https://tonviewer.com/verification when submitting the contract verification request.",
      "Cross-reference the metadata SHA-256 hash above with the hosted JSON served to Tonviewer/Tonkeeper.",
      "Attach governance evidence (timelock + multisig) in the support ticket alongside this bundle.",
    ],
  };

  const instructionsMarkdown = `# DCT Tonviewer Verification Bundle\n\n` +
    `This archive packages the canonical Dynamic Capital Token (DCT) artifacts required by Tonviewer and TON Discovery reviewers.` +
    `\n\n` +
    `## Contents\n\n` +
    `- \`contracts/jetton/discoverable/\` — FunC master source plus import modules required for Tonviewer diffing.\n` +
    `- \`contracts/jetton/metadata.json\` — Frozen jetton metadata served to wallets and explorers.\n` +
    `- \`contracts/README.md\` — Deployment and governance notes for auditors.\n` +
    `- \`manifest.json\` — Machine-readable summary with metadata checksums.\n\n` +
    `## Submission checklist\n\n` +
    `1. Host \`metadata.json\` at the same URI configured in the on-chain content cell.\n` +
    `2. Submit the archive through the Tonviewer verification portal and cite the multisig/timelock controls.\n` +
    `3. After approval, refresh Tonviewer and Tonkeeper to confirm the \"Verified\" badge is displayed.\n`;

  await copyPathIntoBundle(
    projectRoot,
    stagingDir,
    join("contracts", "jetton", "discoverable"),
  );
  await copyPathIntoBundle(
    projectRoot,
    stagingDir,
    join("contracts", "jetton", "metadata.json"),
  );
  await copyPathIntoBundle(
    projectRoot,
    stagingDir,
    join("contracts", "README.md"),
  );
  await writeFile(
    stagingDir,
    "manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(stagingDir, "README.md", instructionsMarkdown + "\n");

  try {
    await Deno.remove(zipTarget);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  const zipProcess = new Deno.Command("zip", {
    args: ["-r", zipTarget, "."],
    cwd: stagingDir,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, success, stdout, stderr } = await zipProcess.output();
  if (!success) {
    throw new Error(
      `zip command failed with code ${code}: ${textDecoder.decode(stderr)}`,
    );
  }

  console.log(textDecoder.decode(stdout).trim());
  console.log(`\nVerification bundle created at: ${zipTarget}`);
  console.log(`Jetton master address: ${jettonAddress}`);
  console.log(`metadata.json SHA-256: ${metadataSha256}`);
}

if (import.meta.main) {
  await main();
}
