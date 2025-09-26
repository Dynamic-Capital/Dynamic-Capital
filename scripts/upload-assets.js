#!/usr/bin/env node
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readdir, readFile } from "fs/promises";
import path from "node:path";
import { getCacheControl, getContentType } from "./utils/static-assets.js";

const bucket = process.env.CDN_BUCKET;
const region = process.env.CDN_REGION || "nyc3";
const spacesEndpoint = resolveSpacesEndpoint(process.env.CDN_ENDPOINT, {
  region,
  bucket,
});
const accessKeyId = process.env.CDN_ACCESS_KEY;
const secretAccessKey = process.env.CDN_SECRET_KEY;
const distDir = process.argv[2] || "_static";
const digitalOceanToken = (process.env.DIGITALOCEAN_TOKEN || "").trim();
const cdnEndpointId = (process.env.CDN_ENDPOINT_ID || "").trim();
const purgePaths = parsePurgePaths(process.env.CDN_PURGE_PATHS);

if (!bucket || !accessKeyId || !secretAccessKey) {
  console.error(
    "Missing CDN configuration (CDN_BUCKET, CDN_ACCESS_KEY, CDN_SECRET_KEY).",
  );
  process.exit(1);
}

const client = new S3Client({
  region,
  endpoint: spacesEndpoint,
  credentials: { accessKeyId, secretAccessKey },
});

function resolveSpacesEndpoint(input, { region, bucket }) {
  const fallback = `https://${region}.digitaloceanspaces.com`;
  if (!input) {
    return fallback;
  }

  let normalized = String(input).trim();
  if (!normalized) {
    return fallback;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    console.warn(
      `CDN_ENDPOINT is not a valid URL (${input}). Falling back to ${fallback} for DigitalOcean Spaces uploads.`,
    );
    return fallback;
  }

  if (parsed.pathname && parsed.pathname !== "/") {
    console.warn(
      `Ignoring path component on CDN_ENDPOINT (${parsed.pathname}). Using ${parsed.origin} for uploads.`,
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes("digitaloceanspaces.com")) {
    console.warn(
      `CDN_ENDPOINT (${host}) does not point to the DigitalOcean Spaces API. Falling back to ${fallback} for uploads.`,
    );
    return fallback;
  }

  if (bucket && host.startsWith(`${bucket.toLowerCase()}.`)) {
    console.warn(
      `CDN_ENDPOINT references the bucket domain (${host}). Use the regional endpoint instead. Falling back to ${fallback}.`,
    );
    return fallback;
  }

  return parsed.origin;
}

function parsePurgePaths(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item === "*" || item.startsWith("/") ? item : `/${item}`));
}

async function purgeCdnCache(endpointId, token, files) {
  const response = await fetch(
    `https://api.digitalocean.com/v2/cdn/endpoints/${endpointId}/cache`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "dynamic-capital-upload-assets/1.0",
      },
      body: JSON.stringify({ files }),
    },
  );

  if (!response.ok) {
    let message =
      `DigitalOcean API cache purge failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message += `: ${payload.message}`;
      }
    } catch {
      // ignore JSON parse issues
    }
    throw new Error(message);
  }
}

async function uploadDir(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const key = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      await uploadDir(full, key);
    } else {
      const body = await readFile(full);
      const type = getContentType(key);
      const cacheControl = getCacheControl(key, type);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ACL: "public-read",
          ContentType: type,
          CacheControl: cacheControl,
        }),
      );
      console.log(`Uploaded ${key}`);
    }
  }
}

async function maybePurgeCdn() {
  if (!digitalOceanToken && !cdnEndpointId && purgePaths.length === 0) {
    return;
  }

  if (!cdnEndpointId || !digitalOceanToken) {
    console.warn(
      "Skipping DigitalOcean CDN cache purge because CDN_ENDPOINT_ID or DIGITALOCEAN_TOKEN is not set.",
    );
    return;
  }

  if (purgePaths.length === 0) {
    console.warn(
      "Skipping DigitalOcean CDN cache purge because CDN_PURGE_PATHS is empty. Set it to a comma-separated list of paths (for example `/index.html`).",
    );
    return;
  }

  console.log(`Purging DigitalOcean CDN cache for ${purgePaths.join(", ")}…`);
  await purgeCdnCache(cdnEndpointId, digitalOceanToken, purgePaths);
  console.log("DigitalOcean CDN cache purge request submitted.");
}

async function main() {
  await uploadDir(distDir);
  await maybePurgeCdn();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
