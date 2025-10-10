#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Address, beginCell, toNano, Cell } from "@ton/core";

const DECIMALS = 9n;
const DEFAULT_FORWARD_TON = "0.05";
const TREASURY_MULTISIG_ADDRESS = "EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq";
const JETTON_MASTER_ADDRESS = "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y";
const GAS_BUFFER_MIN = toNano("0.01");
const GAS_BUFFER_MAX = toNano("0.02");

const HELP_TEXT = `Usage: npm run ton:start-minting -- [options]\n\nOptions:\n  --amount <value>           DCT amount to mint (e.g. 125000 or 12.5).\n  --nano-amount <value>      Raw nano DCT amount (overrides --amount).\n  --destination <address>    Destination wallet address that will receive the minted jettons.\n  --response <address>       Optional response destination (defaults to destination).\n  --forward-ton <value>      TON value forwarded to the jetton wallet (default: ${DEFAULT_FORWARD_TON}).\n  --comment <text>           Optional comment forwarded to the jetton wallet.\n  --query-id <value>         64-bit query id (default: current unix timestamp).\n  --master <address>         Jetton master contract address (default: ${JETTON_MASTER_ADDRESS}).\n  --save-boc <path>          Persist the binary BOC payload to the provided path.\n  --json                     Output a JSON summary instead of human readable logs.\n  --help                     Show this message.\n\nDefaults:\n  Treasury multisig: ${TREASURY_MULTISIG_ADDRESS}\n  Jetton master:    ${JETTON_MASTER_ADDRESS}\n`;

type MintOptions = {
  amount?: string;
  nanoAmount?: string;
  destination?: string;
  response?: string;
  forwardTon?: string;
  comment?: string;
  queryId?: string;
  master?: string;
  saveBoc?: string;
  json?: boolean;
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
      case "--master":
        options.master = argv[++i];
        break;
      case "--save-boc":
        options.saveBoc = argv[++i];
        break;
      case "--json":
        options.json = true;
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

function formatNanoAmount(amount: bigint, decimals: bigint): string {
  const multiplier = 10n ** decimals;
  const whole = amount / multiplier;
  const fraction = amount % multiplier;
  if (fraction === 0n) {
    return whole.toString();
  }
  const fractionString = fraction.toString().padStart(Number(decimals), "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionString}`;
}

async function persistBoc(path: string, base64Boc: string) {
  const resolvedPath = resolve(path);
  await mkdir(dirname(resolvedPath), { recursive: true });
  const buffer = Buffer.from(base64Boc, "base64");
  await writeFile(resolvedPath, buffer);
  return resolvedPath;
}

async function main() {
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
  const master = Address.parse(options.master ?? JETTON_MASTER_ADDRESS);

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

  const forwardTon = toNano(options.forwardTon ?? DEFAULT_FORWARD_TON);
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
    const emptyCell = beginCell().endCell();
    body.storeBit(0).storeSlice(emptyCell.beginParse());
  }

  const boc = body.endCell().toBoc({ idx: false }).toString("base64");
  const formattedAmount = formatNanoAmount(amount, DECIMALS);
  const sendTonMin = forwardTon + GAS_BUFFER_MIN;
  const sendTonMax = forwardTon + GAS_BUFFER_MAX;

  const summary = {
    boc,
    jettonMaster: master.toString(),
    destination: destination.toString(),
    response: response.toString(),
    nanoAmount: amount.toString(),
    formattedAmount,
    forwardTon: forwardTon.toString(),
    forwardTonReadable: formatNanoAmount(forwardTon, 9n),
    sendTonMin: sendTonMin.toString(),
    sendTonMinReadable: formatNanoAmount(sendTonMin, 9n),
    sendTonMax: sendTonMax.toString(),
    sendTonMaxReadable: formatNanoAmount(sendTonMax, 9n),
    queryId: queryId.toString(),
    comment: options.comment ?? null,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("Mint payload (base64):", boc);
    console.log("Parameters:");
    console.log(`  Jetton master: ${summary.jettonMaster}`);
    console.log(
      `  Send TON: ${summary.forwardTonReadable} TON forwarded + 0.01–0.02 TON for fees (enter ${summary.sendTonMinReadable}-${summary.sendTonMaxReadable} TON)`,
    );
    console.log(`  Destination jetton wallet: ${summary.destination}`);
    console.log(`  Response destination: ${summary.response}`);
    console.log(`  Amount (DCT): ${formattedAmount}`);
    console.log(`  Amount (nano DCT): ${amount}`);
    console.log(`  Forward TON: ${summary.forwardTonReadable} (${forwardTon.toString()} nanotons)`);
    console.log(`  Query ID: ${queryId}`);
    if (options.comment) {
      console.log(`  Comment: ${options.comment}`);
    }
  }

  if (options.saveBoc) {
    try {
      const savedPath = await persistBoc(options.saveBoc, boc);
      if (!options.json) {
        console.log(`Saved BOC payload to ${savedPath}`);
      }
    } catch (error) {
      console.error(`Failed to save BOC payload: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
