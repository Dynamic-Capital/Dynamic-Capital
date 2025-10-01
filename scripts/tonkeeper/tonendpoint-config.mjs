#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { exit, stderr, stdout } from "node:process";

import http from "node:http";
import https from "node:https";
import { lookup as dnsLookup } from "node:dns";
import { URL } from "node:url";

const DEFAULT_BOOT = "https://boot.tonkeeper.com";
const NETWORKS = new Set(["mainnet", "testnet", "both"]);

function parseArgs(argv) {
  const args = { headers: [], pretty: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--boot":
        args.boot = argv[++i];
        break;
      case "--build":
        args.build = argv[++i];
        break;
      case "--platform":
        args.platform = argv[++i];
        break;
      case "--network":
        args.network = argv[++i];
        break;
      case "--lang":
        args.lang = argv[++i];
        break;
      case "--device-country":
        args.deviceCountry = argv[++i];
        break;
      case "--store-country":
        args.storeCountry = argv[++i];
        break;
      case "--header":
        args.headers.push(argv[++i]);
        break;
      case "--pretty":
        args.pretty = true;
        break;
      case "--output":
        args.output = argv[++i];
        break;
      default:
        if (token.startsWith("-")) {
          throw new Error(`Unknown flag: ${token}`);
        }
    }
  }
  return args;
}

function usage() {
  return `Usage: tonendpoint-config.mjs [options]\n\n` +
    "Options:\n" +
    "  --boot <url>             Boot endpoint base (default https://boot.tonkeeper.com)\n" +
    "  --build <label>          Build label to request (required)\n" +
    "  --platform <name>        Platform passed to Tonendpoint (default web)\n" +
    "  --network <name>         mainnet, testnet, or both (default mainnet)\n" +
    "  --lang <code>            Language code (default en)\n" +
    "  --device-country <code>  Optional device country code\n" +
    "  --store-country <code>   Optional store country code\n" +
    '  --header "Key:Value"      Extra header (repeatable, e.g. Authorization)\n' +
    "  --pretty                 Pretty-print JSON output\n" +
    "  --output <file>          Write JSON result to file instead of stdout\n" +
    "  --help                   Show this message\n";
}

function buildSearchParams(
  { build, platform, lang, network, deviceCountry, storeCountry },
) {
  const params = new URLSearchParams({
    build,
    platform,
    lang,
    chainName: network === "testnet" ? "testnet" : "mainnet",
  });

  if (deviceCountry) {
    params.set("device_country_code", deviceCountry);
  }
  if (storeCountry) {
    params.set("store_country_code", storeCountry);
  }

  return params;
}

function buildHeaderObject(headers) {
  const map = {};
  for (const header of headers) {
    const [key, ...rest] = header.split(":");
    if (!key || rest.length === 0) {
      throw new Error(`Invalid header format: ${header}. Expected "Key:Value"`);
    }
    map[key.trim()] = rest.join(":").trim();
  }
  return map;
}

function requestJson(url, headers) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "http:" ? http : https;
    const options = {
      method: "GET",
      headers,
      family: 4,
      lookup: (hostname, lookupOptions, callback) => {
        dnsLookup(hostname, { ...lookupOptions, family: 4 }, callback);
      },
    };

    const req = client.request(target, options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              body: JSON.parse(data),
            });
          } catch (error) {
            reject(
              new Error(`Failed to parse JSON response: ${error.message}`),
            );
          }
        } else {
          reject(
            new Error(
              `Request failed (${res.statusCode} ${res.statusMessage}): ${data}`,
            ),
          );
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function fetchConfig({ boot, searchParams, headers }) {
  const requestUrl = `${
    boot.replace(/\/$/, "")
  }/keys?${searchParams.toString()}`;
  const headerObject = buildHeaderObject(headers);
  const { body } = await requestJson(requestUrl, headerObject);
  return body;
}

function normalizeNetwork(network) {
  if (!network) return "mainnet";
  if (!NETWORKS.has(network)) {
    throw new Error(
      `Unsupported network: ${network}. Use mainnet, testnet, or both.`,
    );
  }
  return network;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      stdout.write(usage());
      return;
    }

    if (!args.build) {
      throw new Error("Missing required flag: --build");
    }

    const network = normalizeNetwork(args.network);
    const baseBoot = args.boot ?? DEFAULT_BOOT;
    const platform = args.platform ?? "web";
    const lang = args.lang ?? "en";

    const targets = network === "both" ? ["mainnet", "testnet"] : [network];
    const results = {};

    for (const net of targets) {
      const params = buildSearchParams({
        build: args.build,
        platform,
        lang,
        network: net,
        deviceCountry: args.deviceCountry,
        storeCountry: args.storeCountry,
      });

      const payload = await fetchConfig({
        boot: baseBoot,
        searchParams: params,
        headers: args.headers,
      });
      results[net] = payload;
    }

    const outputPayload = network === "both" ? results : results[targets[0]];
    const json = JSON.stringify(outputPayload, null, args.pretty ? 2 : 0);

    if (args.output) {
      await writeFile(args.output, `${json}\n`);
      stdout.write(`Saved Tonendpoint payload to ${args.output}\n`);
    } else {
      stdout.write(`${json}\n`);
    }
  } catch (error) {
    stderr.write(`${error.message}\n`);
    stderr.write(usage());
    exit(1);
  }
}

await main();
