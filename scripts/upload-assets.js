#!/usr/bin/env node
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readdir, readFile } from "fs/promises";
import path from "node:path";

const bucket = process.env.CDN_BUCKET;
const region = process.env.CDN_REGION || "nyc3";
const endpoint = process.env.CDN_ENDPOINT || `https://${region}.digitaloceanspaces.com`;
const accessKeyId = process.env.CDN_ACCESS_KEY;
const secretAccessKey = process.env.CDN_SECRET_KEY;
const distDir = process.argv[2] || "apps/landing/dist";

if (!bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing CDN configuration (CDN_BUCKET, CDN_ACCESS_KEY, CDN_SECRET_KEY).");
  process.exit(1);
}

const client = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

async function uploadDir(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const key = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      await uploadDir(full, key);
    } else {
      const body = await readFile(full);
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ACL: "public-read" }));
      console.log(`Uploaded ${key}`);
    }
  }
}

uploadDir(distDir).catch((err) => {
  console.error(err);
  process.exit(1);
});
