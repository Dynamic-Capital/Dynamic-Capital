export const OFFCHAIN_IPFS_GATEWAY_BASE = "https://ipfs.io";

function trimSlashes(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === "/") start += 1;
  while (end > start && value[end - 1] === "/") end -= 1;

  return value.slice(start, end);
}

function stripIpfsScheme(value: string): string {
  let working = value.trim();

  if (working.startsWith("ipfs://")) {
    working = working.slice("ipfs://".length);
  } else if (working.startsWith("ipfs:/")) {
    working = working.slice("ipfs:/".length);
  } else if (working.startsWith("ipfs:")) {
    working = working.slice("ipfs:".length);
  } else if (working.startsWith("/ipfs/")) {
    working = working.slice("/ipfs/".length);
  } else if (working.startsWith("ipfs/")) {
    working = working.slice("ipfs/".length);
  }

  return trimSlashes(working);
}

function splitSuffix(value: string): [string, string] {
  let working = value;
  let suffix = "";

  const hashIndex = working.indexOf("#");
  if (hashIndex >= 0) {
    suffix = working.slice(hashIndex);
    working = working.slice(0, hashIndex);
  }

  const queryIndex = working.indexOf("?");
  if (queryIndex >= 0) {
    const query = working.slice(queryIndex);
    working = working.slice(0, queryIndex);
    suffix = `${query}${suffix}`;
  }

  return [working, suffix];
}

export function resolveOffchainIpfsGatewayUrl(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) {
    return `${OFFCHAIN_IPFS_GATEWAY_BASE}/ipfs`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const [withoutSuffix, suffix] = splitSuffix(trimmed);
  const path = stripIpfsScheme(withoutSuffix);
  if (!path) {
    return `${OFFCHAIN_IPFS_GATEWAY_BASE}/ipfs${suffix}`;
  }

  return `${OFFCHAIN_IPFS_GATEWAY_BASE}/ipfs/${path}${suffix}`;
}

export function isIpfsUri(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("ipfs://") || trimmed.startsWith("/ipfs/") ||
    trimmed.startsWith("ipfs/");
}
