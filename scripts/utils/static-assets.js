import { lookup } from "mime-types";

const HASH_REGEX = /\.[0-9a-f]{8,}\./i;

export function getContentType(filename) {
  const type = lookup(filename);
  return type || "application/octet-stream";
}

export function isImmutableAsset(filename) {
  return HASH_REGEX.test(filename);
}

export function getCacheControl(filename, contentType) {
  const type = contentType || getContentType(filename);
  if (type.startsWith("text/html")) {
    return "public, max-age=0, must-revalidate";
  }
  return isImmutableAsset(filename)
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate";
}
