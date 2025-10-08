import { parse } from "https://deno.land/std@0.224.0/yaml/mod.ts";
import {
  dirname,
  fromFileUrl,
  join,
  resolve,
} from "https://deno.land/std@0.224.0/path/mod.ts";

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

export function resolveProjectRoot(metaUrl: string): string {
  const here = dirname(fromFileUrl(metaUrl));
  return resolve(join(here, "..", ".."));
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

export async function computeSha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
