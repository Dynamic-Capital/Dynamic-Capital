#!/usr/bin/env node
import { Address, beginCell, toNano, Cell } from "@ton/core";

const DECIMALS = 9n;

const HELP_TEXT = `Usage: npm run ton:start-minting -- [options]\n\nOptions:\n  --amount <value>           DCT amount to mint (e.g. 125000 or 12.5).\n  --nano-amount <value>      Raw nano DCT amount (overrides --amount).\n  --destination <address>    Destination wallet address that will receive the minted jettons.\n  --response <address>       Optional response destination (defaults to destination).\n  --forward-ton <value>      TON value forwarded to the jetton wallet (default: 0.05).\n  --comment <text>           Optional comment forwarded to the jetton wallet.\n  --query-id <value>         64-bit query id (default: current unix timestamp).\n  --help                     Show this message.\n`;

type MintOptions = {
  amount?: string;
  nanoAmount?: string;
  destination?: string;
  response?: string;
  forwardTon?: string;
  comment?: string;
  queryId?: string;
  help?: boolean;
};

function parseArgs(argv: string[]): MintOptions {
  const options: MintOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--help":
        options.help = true;
        break;
      case "--amount":
        options.amount = argv[++i];
        break;
      case "--nano-amount":
        options.nanoAmount = argv[++i];
        break;
      case "--destination":
        options.destination = argv[++i];
        break;
      case "--response":
        options.response = argv[++i];
        break;
      case "--forward-ton":
        options.forwardTon = argv[++i];
        break;
      case "--comment":
        options.comment = argv[++i];
        break;
      case "--query-id":
        options.queryId = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function parseDecimalAmount(input: string, decimals: bigint): bigint {
  const [wholePart, fractionalPart = ""] = input.split(".");
  if (!/^\d+$/.test(wholePart) || (fractionalPart && !/^\d+$/.test(fractionalPart))) {
    throw new Error(`Invalid decimal amount: ${input}`);
  }
  const whole = BigInt(wholePart);
  if (fractionalPart.length > Number(decimals)) {
    throw new Error(
      `Too many decimal places: received ${fractionalPart.length}, max is ${decimals}`,
    );
  }
  const paddedFraction = fractionalPart.padEnd(Number(decimals), "0");
  const fraction = paddedFraction === "" ? 0n : BigInt(paddedFraction);
  const multiplier = 10n ** decimals;
  return whole * multiplier + fraction;
}

function buildCommentCell(comment: string): Cell {
  return beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
}

function main() {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv);

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  if (!options.destination) {
    throw new Error("--destination is required");
  }

  const destination = Address.parse(options.destination);
  const response = options.response ? Address.parse(options.response) : destination;

  let amount: bigint;
  if (options.nanoAmount) {
    amount = BigInt(options.nanoAmount);
  } else if (options.amount) {
    amount = parseDecimalAmount(options.amount, DECIMALS);
  } else {
    throw new Error("Provide either --amount or --nano-amount");
  }

  if (amount <= 0n) {
    throw new Error("Mint amount must be greater than zero");
  }

  const forwardTon = toNano(options.forwardTon ?? "0.05");
  const queryId = options.queryId ? BigInt(options.queryId) : BigInt(Math.floor(Date.now() / 1000));
  const commentCell = options.comment ? buildCommentCell(options.comment) : null;

  const body = beginCell()
    .storeUint(0x178d4519, 32)
    .storeUint(queryId, 64)
    .storeCoins(amount)
    .storeAddress(destination)
    .storeAddress(response)
    .storeBit(0); // no custom payload

  body.storeCoins(forwardTon);

  if (commentCell) {
    body.storeBit(1).storeRef(commentCell);
  } else {
    body.storeBit(1).storeRef(beginCell().endCell());
  }

  const boc = body.endCell().toBoc({ idx: false }).toString("base64");

  console.log("Mint payload (base64):", boc);
  console.log("Parameters:");
  console.log(`  Amount (nano DCT): ${amount}`);
  console.log(`  Destination: ${destination.toString()}`);
  console.log(`  Response: ${response.toString()}`);
  console.log(`  Forward TON: ${forwardTon.toString()} nanotons`);
  console.log(`  Query ID: ${queryId}`);
  if (options.comment) {
    console.log(`  Comment: ${options.comment}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
