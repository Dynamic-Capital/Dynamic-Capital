import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";

import {
  Address,
  beginCell,
  Cell,
  contractAddress,
  storeStateInit,
  toNano,
} from "@ton/core";

interface CliOptions {
  readonly ownerFriendly: string;
  readonly jettonFriendly: string;
  readonly codePath: string;
  readonly statePath?: string;
  readonly topupTon: number;
  readonly workchain: number;
}

interface DeploymentSummary {
  readonly address: string;
  readonly addressNonBounceable: string;
  readonly rawAddress: string;
  readonly codeHash: string;
  readonly dataHash: string;
  readonly stateInitHash: string;
  readonly stateInitBoc: string;
  readonly tonConnectRequest: TonConnectRequest;
}

interface TonConnectMessage {
  readonly address: string;
  readonly amount: string;
  readonly stateInit: string;
  readonly payload?: string;
}

interface TonConnectRequest {
  readonly validUntil: number;
  readonly messages: readonly TonConnectMessage[];
  readonly metadata: {
    readonly name: string;
    readonly description: string;
    readonly externalUrl: string;
  };
}

function usage(message?: string): never {
  if (message) {
    console.error(`\n❌ ${message}`);
  }
  console.error(
    `\nJetton metadata updater deployment helper\n\n` +
      `Required flags:\n` +
      `  --owner   Friendly address of the DAO multisig owner\n` +
      `  --jetton  Friendly address of the DCT jetton master\n` +
      `  --code    Path to the compiled JettonMetadataUpdater .code.boc file\n\n` +
      `Optional flags:\n` +
      `  --state <path>       Write a Ton Connect payload to the given JSON file\n` +
      `  --topup <TON>        Initial TON value forwarded with deployment (default 0.2)\n` +
      `  --workchain <id>     Target workchain (default 0)\n`,
  );
  process.exit(1);
}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: Partial<CliOptions> = {
    topupTon: 0.2,
    workchain: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (token === "--owner") {
      options.ownerFriendly = argv[++i] ?? usage("Missing value for --owner");
      continue;
    }
    if (token.startsWith("--owner=")) {
      options.ownerFriendly = token.split("=", 2)[1] ??
        usage("Missing value for --owner");
      continue;
    }

    if (token === "--jetton") {
      options.jettonFriendly = argv[++i] ?? usage("Missing value for --jetton");
      continue;
    }
    if (token.startsWith("--jetton=")) {
      options.jettonFriendly = token.split("=", 2)[1] ??
        usage("Missing value for --jetton");
      continue;
    }

    if (token === "--code") {
      options.codePath = argv[++i] ?? usage("Missing value for --code");
      continue;
    }
    if (token.startsWith("--code=")) {
      options.codePath = token.split("=", 2)[1] ??
        usage("Missing value for --code");
      continue;
    }

    if (token === "--state") {
      options.statePath = argv[++i];
      continue;
    }
    if (token.startsWith("--state=")) {
      options.statePath = token.split("=", 2)[1];
      continue;
    }

    if (token === "--topup") {
      const value = argv[++i];
      if (!value) usage("Missing value for --topup");
      options.topupTon = Number.parseFloat(value);
      continue;
    }
    if (token.startsWith("--topup=")) {
      const value = token.split("=", 2)[1];
      options.topupTon = value ? Number.parseFloat(value) : NaN;
      continue;
    }

    if (token === "--workchain") {
      const value = argv[++i];
      if (!value) usage("Missing value for --workchain");
      options.workchain = Number.parseInt(value, 10);
      continue;
    }
    if (token.startsWith("--workchain=")) {
      const value = token.split("=", 2)[1];
      options.workchain = value ? Number.parseInt(value, 10) : NaN;
      continue;
    }

    if (token === "--help" || token === "-h") {
      usage();
    }
  }

  if (!options.ownerFriendly) usage("--owner is required");
  if (!options.jettonFriendly) usage("--jetton is required");
  if (!options.codePath) usage("--code is required");

  const topupTon = options.topupTon;
  if (!Number.isFinite(topupTon) || topupTon === undefined || topupTon < 0) {
    usage("--topup must be a non-negative number");
  }

  const workchain = options.workchain;
  if (!Number.isInteger(workchain!) || workchain === undefined) {
    usage("--workchain must be an integer");
  }

  return {
    ownerFriendly: options.ownerFriendly!,
    jettonFriendly: options.jettonFriendly!,
    codePath: resolve(options.codePath!),
    statePath: options.statePath ? resolve(options.statePath) : undefined,
    topupTon: topupTon!,
    workchain: workchain!,
  };
}

function parseAddress(value: string, label: string): Address {
  try {
    return Address.parse(value);
  } catch {
    try {
      return Address.parseFriendly(value).address;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid ${label} address: ${reason}`);
    }
  }
}

async function loadCodeCell(path: string): Promise<Cell> {
  const buffer = await readFile(path);
  const cells = Cell.fromBoc(buffer);
  if (cells.length === 0) {
    throw new Error(`Code BOC at ${path} is empty.`);
  }
  return cells[0]!;
}

function buildDataCell(owner: Address, jetton: Address): Cell {
  return beginCell().storeAddress(owner).storeAddress(jetton).endCell();
}

function buildStateInit(code: Cell, data: Cell): Cell {
  return beginCell().store(storeStateInit({ code, data })).endCell();
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function formatSummary(summary: DeploymentSummary): string {
  const lines = [
    "Jetton Metadata Updater deployment summary:",
    `  Bounceable address:     ${summary.address}`,
    `  Non-bounceable address: ${summary.addressNonBounceable}`,
    `  Raw workchain:hash:     ${summary.rawAddress}`,
    `  Code hash:              ${summary.codeHash}`,
    `  Data hash:              ${summary.dataHash}`,
    `  State init hash:        ${summary.stateInitHash}`,
    `  State init (base64url): ${summary.stateInitBoc}`,
  ];
  return lines.join("\n");
}

function createTonConnectRequest(
  addressBounceable: string,
  stateInitBase64: string,
  amountTon: number,
): TonConnectRequest {
  const validUntil = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  const amountNano = toNano(amountTon).toString();
  return {
    validUntil,
    messages: [
      {
        address: addressBounceable,
        amount: amountNano,
        stateInit: stateInitBase64,
      },
    ],
    metadata: {
      name: "Dynamic Capital",
      description: "Deploy the Jetton metadata updater helper contract.",
      externalUrl: "https://dynamic.capital",
    },
  };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const ownerAddress = parseAddress(options.ownerFriendly, "owner");
    const jettonAddress = parseAddress(options.jettonFriendly, "jetton");
    const codeCell = await loadCodeCell(options.codePath);
    const dataCell = buildDataCell(ownerAddress, jettonAddress);
    const stateInitCell = buildStateInit(codeCell, dataCell);
    const stateInitBoc = stateInitCell.toBoc({ idx: false });
    const stateInitBase64 = stateInitBoc.toString("base64");

    const contractAddr = contractAddress(options.workchain, {
      code: codeCell,
      data: dataCell,
    });

    const bounceable = contractAddr.toString({
      urlSafe: true,
      bounceable: true,
    });
    const nonBounceable = contractAddr.toString({
      urlSafe: true,
      bounceable: false,
    });
    const raw = contractAddr.toRawString();

    const summary: DeploymentSummary = {
      address: bounceable,
      addressNonBounceable: nonBounceable,
      rawAddress: raw,
      codeHash: codeCell.hash().toString("hex"),
      dataHash: dataCell.hash().toString("hex"),
      stateInitHash: stateInitCell.hash().toString("hex"),
      stateInitBoc: toBase64Url(stateInitBoc),
      tonConnectRequest: createTonConnectRequest(
        bounceable,
        stateInitBase64,
        options.topupTon,
      ),
    };

    console.log(formatSummary(summary));

    if (options.statePath) {
      const payload = {
        address: summary.address,
        addressNonBounceable: summary.addressNonBounceable,
        rawAddress: summary.rawAddress,
        codeHash: summary.codeHash,
        dataHash: summary.dataHash,
        stateInitHash: summary.stateInitHash,
        stateInitBase64,
        tonConnect: summary.tonConnectRequest,
        topupTon: options.topupTon,
        workchain: options.workchain,
        artifacts: {
          code: basename(options.codePath),
        },
      } satisfies DeploymentSummary & {
        readonly stateInitBase64: string;
        readonly tonConnect: TonConnectRequest;
        readonly topupTon: number;
        readonly workchain: number;
        readonly artifacts: { readonly code: string };
      };

      await writeFile(options.statePath, JSON.stringify(payload, null, 2));
      console.log(`\n📝 Wrote Ton Connect payload to ${options.statePath}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`\n[deploy-jetton-metadata-updater] ${reason}`);
    process.exitCode = 1;
  }
}

await main();
