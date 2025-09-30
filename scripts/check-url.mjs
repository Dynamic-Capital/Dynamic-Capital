#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { URL } from "node:url";
import process from "node:process";
import { parseArgs } from "node:util";

function usage(message) {
  const help = `Check the reachability of an HTTP(S) endpoint.\n\n` +
    `Usage: node scripts/check-url.mjs --url <url> [--method <METHOD>] [--timeout <ms>] [--redirect <policy>] [--max-redirects <n>]`;
  if (message) {
    console.error(`${message}\n\n${help}`);
  } else {
    console.log(help);
  }
}

const parsed = parseArgs({
  options: {
    url: { type: "string" },
    method: { type: "string" },
    timeout: { type: "string" },
    redirect: { type: "string" },
    "max-redirects": { type: "string" },
    help: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const { values, positionals } = parsed;

if (values.help) {
  usage();
  process.exit(0);
}

const targetUrl = values.url ?? positionals[0];
if (!targetUrl) {
  usage("Missing required --url argument.");
  process.exit(1);
}

const method = values.method ? values.method.toUpperCase() : "GET";
const timeout = values.timeout ? Number(values.timeout) : 10000;
if (Number.isNaN(timeout) || timeout <= 0) {
  usage("--timeout must be a positive integer representing milliseconds.");
  process.exit(1);
}

const allowedRedirectPolicies = new Map([
  ["follow", "follow"],
  ["manual", "manual"],
  ["error", "error"],
]);
const redirectPolicy = values.redirect ?? "manual";
if (!allowedRedirectPolicies.has(redirectPolicy)) {
  usage("--redirect must be one of: follow, manual, error.");
  process.exit(1);
}

const maxRedirects = values["max-redirects"] ? Number(values["max-redirects"]) : 5;
if (Number.isNaN(maxRedirects) || maxRedirects < 0) {
  usage("--max-redirects must be a non-negative integer.");
  process.exit(1);
}

function performRequest(urlString, redirectsRemaining) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    let settled = false;
    const url = new URL(urlString);
    const client = url.protocol === "https:" ? https : http;

    dns.lookup(url.hostname, { family: 4 }, (lookupError, address) => {
      if (lookupError) {
        settled = true;
        reject(lookupError);
        return;
      }

      const request = client.request({
        host: address,
        servername: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Host: url.host,
          "User-Agent": "dynamic-capital-check-url/1.0",
          Accept: "*/*",
        },
      }, (response) => {
        const duration = Date.now() - start;
        const statusCode = response.statusCode ?? 0;
        const statusMessage = response.statusMessage ?? "";
        const location = response.headers.location ?? null;

        response.resume();
        response.on("end", () => {
          if (settled) return;
          if (
            statusCode >= 300 &&
            statusCode < 400 &&
            location &&
            redirectPolicy === "follow"
          ) {
            if (redirectsRemaining <= 0) {
              settled = true;
              reject(new Error("Maximum redirects exceeded"));
              return;
            }
            const nextUrl = new URL(location, url).toString();
            settled = true;
            performRequest(nextUrl, redirectsRemaining - 1)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (
            statusCode >= 300 &&
            statusCode < 400 &&
            location &&
            redirectPolicy === "error"
          ) {
            settled = true;
            reject(new Error(`Redirect encountered (${statusCode}) to ${location}`));
            return;
          }

          settled = true;
          resolve({
            ok: statusCode >= 200 && statusCode < 300,
            status: statusCode,
            statusText: statusMessage,
            duration,
            location,
          });
        });
      });

      request.on("error", (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });

      request.setTimeout(timeout, () => {
        request.destroy(new Error(`Request timed out after ${timeout}ms`));
      });

      request.end();
    });
  });
}

try {
  const result = await performRequest(targetUrl, maxRedirects);
  if (result.ok) {
    console.log(
      `Success: ${method} ${targetUrl} -> ${result.status} ${result.statusText} (${result.duration}ms)`,
    );
    if (result.location) {
      console.log(`Redirect location: ${result.location}`);
    }
    process.exit(0);
  }
  console.error(
    `Failure: ${method} ${targetUrl} -> ${result.status} ${result.statusText} (${result.duration}ms)`,
  );
  if (result.location) {
    console.error(`Redirect location: ${result.location}`);
  }
  process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failure: ${method} ${targetUrl} -> ${message}`);
  process.exit(1);
}
