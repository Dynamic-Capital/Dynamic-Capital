#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const webDir = path.join(repoRoot, "apps", "web");
const standaloneRoot = path.join(webDir, ".next", "standalone");

const serverCandidates = [
  path.join(standaloneRoot, "apps", "web", "server.js"),
  path.join(standaloneRoot, "server.js"),
];

const serverEntry = serverCandidates.find((candidate) => existsSync(candidate));

if (!serverEntry) {
  console.error(
    "Unable to locate the Next.js standalone server. Did you run `npm run build --workspace apps/web`?",
  );
  process.exit(1);
}

const desiredHostname = "0.0.0.0";
process.env.HOSTNAME = desiredHostname;
if (!process.env.HOST || process.env.HOST.trim().length === 0) {
  process.env.HOST = desiredHostname;
}

const parsedPort = Number.parseInt(process.env.PORT ?? "", 10);
const normalizedPort = Number.isFinite(parsedPort) && parsedPort > 0
  ? parsedPort
  : 8080;
process.env.PORT = String(normalizedPort);

process.env.NODE_ENV = "production";

const serverUrl = pathToFileURL(serverEntry);

try {
  await import(serverUrl.href);
} catch (error) {
  console.error("Failed to start Next.js standalone server:", error);
  process.exit(1);
}
