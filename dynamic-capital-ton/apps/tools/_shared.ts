import { parse } from "./deps/deno_std/yaml/mod.ts";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface TokenConfig {
  address?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export interface ContractsConfig {
  admin?: string;
  treasury?: string;
  dexRouter?: string;
}

export interface ProjectConfig {
  token?: TokenConfig;
  contracts?: ContractsConfig;
}

export interface TonviewerManifest {
  metadataSha256?: string;
  [key: string]: unknown;
}

export function resolveProjectRoot(metaUrl: string): string {
  const here = dirname(fileURLToPath(metaUrl));
  return resolve(here, "..", "..");
}

export async function loadProjectConfig(
  projectRoot: string,
): Promise<ProjectConfig> {
  const configText = await Deno.readTextFile(join(projectRoot, "config.yaml"));
  return parse(configText) as ProjectConfig;
}

export async function readJettonMetadata(projectRoot: string) {
  const metadataPath = join(
    projectRoot,
    "contracts",
    "jetton",
    "metadata.json",
  );
  const bytes = await Deno.readFile(metadataPath);
  const text = new TextDecoder().decode(bytes);
  const json = JSON.parse(text) as Record<string, unknown>;

  return { bytes, json, path: metadataPath, text };
}

export async function readTonviewerManifest(projectRoot: string) {
  const manifestPath = join(
    projectRoot,
    "build",
    "tonviewer",
    "bundle",
    "manifest.json",
  );

  try {
    const text = await Deno.readTextFile(manifestPath);
    const json = JSON.parse(text) as TonviewerManifest;
    return { path: manifestPath, text, json };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
}

export async function computeSha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
