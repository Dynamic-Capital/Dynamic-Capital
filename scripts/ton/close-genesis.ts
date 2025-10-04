#!/usr/bin/env node

import { Buffer } from "node:buffer";
import process from "node:process";
import { beginCell } from "@ton/core";

const HELP_MESSAGE =
  `Usage: npx tsx scripts/ton/close-genesis.ts [options]\n\n` +
  "Build the payload required to invoke closeGenesis on the DCT jetton master.\n" +
  "The script prints base64/hex encodings and an optional ton://transfer deep link.\n\n" +
  "Options:\n" +
  "  --query-id <id>     Optional 64-bit query id to include (defaults to 0).\n" +
  "  --deeplink <addr>   Generate a ton://transfer deep link targeting <addr>.\n" +
  "  --amount <tons>     Attach TON value (in whole TON) when building the deep link.\n" +
  "                      Defaults to 0 TON. Ignored without --deeplink.\n" +
  "  --nanotons <value>  Attach TON value expressed in nanotons for the deep link.\n" +
  "                      Overrides --amount when provided.\n" +
  "  --help              Show this message.\n";

const OP_CLOSE_GENESIS = 0x44435401;

interface CliOptions {
  queryId: bigint;
  deepLinkAddress: string | null;
  amountNano: bigint;
}

function parseArgs(argv: readonly string[]): CliOptions | null {
  const options: CliOptions = {
    queryId: 0n,
    deepLinkAddress: null,
    amountNano: 0n,
  };

  const args = [...argv];
  while (args.length > 0) {
    const flag = args.shift();
    if (!flag) continue;

    switch (flag) {
      case "--help":
        return null;
      case "--query-id": {
        const value = args.shift();
        if (!value) {
          throw new Error("--query-id flag requires a numeric value");
        }
        const parsed = BigInt(value);
        if (parsed < 0n || parsed > 0xffffffffffffffffn) {
          throw new Error("--query-id must fit within 64 bits");
        }
        options.queryId = parsed;
        break;
      }
      case "--deeplink": {
        const value = args.shift();
        if (!value) {
          throw new Error("--deeplink flag requires an address value");
        }
        const trimmed = value.trim();
        if (!trimmed) {
          throw new Error("Deep link address must not be empty");
        }
        options.deepLinkAddress = trimmed.replace(/^ton:\/\//i, "");
        break;
      }
      case "--amount": {
        const value = args.shift();
        if (!value) {
          throw new Error("--amount flag requires a TON value");
        }
        const tons = Number.parseFloat(value);
        if (!Number.isFinite(tons) || tons < 0) {
          throw new Error("--amount must be a non-negative number");
        }
        const nanotons = BigInt(Math.round(tons * 1_000_000_000));
        options.amountNano = nanotons;
        break;
      }
      case "--nanotons": {
        const value = args.shift();
        if (!value) {
          throw new Error("--nanotons flag requires an integer value");
        }
        const nanotons = BigInt(value);
        if (nanotons < 0n) {
          throw new Error("--nanotons must be non-negative");
        }
        options.amountNano = nanotons;
        break;
      }
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  return options;
}

function buildPayload(queryId: bigint) {
  const cellBuilder = beginCell()
    .storeUint(OP_CLOSE_GENESIS, 32)
    .storeUint(queryId, 64);
  const cell = cellBuilder.endCell();
  const boc = cell.toBoc();
  const base64 = Buffer.from(boc).toString("base64");
  const hex = Buffer.from(boc).toString("hex");
  return { base64, hex };
}

function toUrlSafeBase64(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function formatDeepLink(
  address: string,
  payloadBase64: string,
  amountNano: bigint,
): string {
  const params = new URLSearchParams();
  if (amountNano > 0n) {
    params.set("amount", amountNano.toString());
  }
  params.set("bin", toUrlSafeBase64(payloadBase64));
  return `ton://transfer/${address}?${params.toString()}`;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      console.log(HELP_MESSAGE);
      return;
    }

    const payload = buildPayload(options.queryId);
    console.log("closeGenesis payload (base64):", payload.base64);
    console.log("closeGenesis payload (hex):   ", payload.hex);

    if (options.deepLinkAddress) {
      const link = formatDeepLink(
        options.deepLinkAddress,
        payload.base64,
        options.amountNano,
      );
      console.log("ton://transfer deep link:   ", link);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[close-genesis] ${message}`);
    process.exitCode = 1;
  }
}

await main();
