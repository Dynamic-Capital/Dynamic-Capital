#!/usr/bin/env -S deno run -A

import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Buffer } from "node:buffer";
import {
  Address,
  Cell,
  OpenedContract,
  SendMode,
  beginCell,
  internal,
  toNano,
} from "npm:@ton/core";
import { JettonMaster, TonClient, WalletContractV4 } from "npm:@ton/ton";
import { mnemonicToPrivateKey } from "npm:@ton/crypto";

import { resolveProjectRoot } from "./_shared.ts";

if (!globalThis.Buffer) {
  // @ts-ignore assign Buffer polyfill for npm packages under Deno
  globalThis.Buffer = Buffer;
}

interface DistributionTargetConfig {
  label: string;
  address: string;
  percent?: number;
  tokens?: number | string;
  note?: string;
  tonValue?: string;
}

interface DistributionPlanConfig {
  controllerWallet: string;
  jettonMaster: string;
  totalSupply: number | string;
  decimals?: number;
  tonEndpoint?: string;
  tonFee?: string;
  mnemonicEnv?: string;
  tonApiKeyEnv?: string;
  batchSize?: number;
  targets: DistributionTargetConfig[];
}

interface CliOptions {
  plan?: string;
  endpoint?: string;
  "mnemonic-env"?: string;
  mnemonic?: string;
  "mnemonic-file"?: string;
  "api-key"?: string;
  dryRun?: boolean;
  "batch-size"?: number;
}

interface DistributionEntry {
  label: string;
  address: Address;
  amount: bigint;
  humanAmount: string;
  percent?: number;
  note?: string;
  tonAmount: bigint;
}

interface DistributionBatch {
  seqno: number;
  entries: DistributionEntry[];
}

const DEFAULT_PLAN_PATH = join("storage", "distribution-plan.json");
const DEFAULT_ENDPOINT = "https://toncenter.com/api/v2/jsonRPC";
const DEFAULT_TON_FEE = "0.25";
const DEFAULT_MNEMONIC_ENV = "DCT_CONTROLLER_MNEMONIC";
const DEFAULT_API_KEY_ENV = "TONCENTER_API_KEY";
const OP_JETTON_TRANSFER = 0x0f8a7ea5;
const EMPTY_CELL = beginCell().endCell();

function readCliOptions(): CliOptions {
  const parsed = parse(Deno.args, {
    string: [
      "plan",
      "endpoint",
      "mnemonic-env",
      "mnemonic",
      "mnemonic-file",
      "api-key",
      "batch-size",
    ],
    boolean: ["dry-run"],
    alias: {
      plan: "config",
      endpoint: "e",
      mnemonic: "m",
      "mnemonic-file": "f",
      "mnemonic-env": "M",
      "api-key": "k",
      "dry-run": "n",
      "batch-size": "b",
    },
  });

  return {
    plan: typeof parsed.plan === "string" ? parsed.plan : undefined,
    endpoint: typeof parsed.endpoint === "string" ? parsed.endpoint : undefined,
    "mnemonic-env": typeof parsed["mnemonic-env"] === "string"
      ? parsed["mnemonic-env"]
      : undefined,
    mnemonic: typeof parsed.mnemonic === "string" ? parsed.mnemonic : undefined,
    "mnemonic-file": typeof parsed["mnemonic-file"] === "string"
      ? parsed["mnemonic-file"]
      : undefined,
    "api-key": typeof parsed["api-key"] === "string"
      ? parsed["api-key"]
      : undefined,
    dryRun: Boolean(parsed["dry-run"]),
    "batch-size": typeof parsed["batch-size"] === "string"
      ? Number.parseInt(parsed["batch-size"], 10)
      : undefined,
  };
}

async function readDistributionPlan(path: string): Promise<DistributionPlanConfig> {
  const text = await Deno.readTextFile(path);
  const data = JSON.parse(text) as DistributionPlanConfig;

  if (!Array.isArray(data.targets) || data.targets.length === 0) {
    throw new Error(
      `distribution plan at ${path} must include at least one target`,
    );
  }

  return data;
}

function ensureAddress(value: string, label: string): Address {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} address is missing`);
  }
  if (value.includes("replace_me")) {
    throw new Error(`${label} address still contains placeholder text: ${value}`);
  }
  try {
    return Address.parse(value);
  } catch (error) {
    throw new Error(
      `${label} address is invalid (${value}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function toBigInt(value: number | string, label: string): bigint {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`${label} must be a finite integer`);
    }
    return BigInt(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = value.replace(/_/g, "").trim();
    if (!/^[-+]?\d+$/.test(normalized)) {
      throw new Error(`${label} must be an integer string`);
    }
    return BigInt(normalized);
  }
  throw new Error(`${label} must be provided`);
}

function formatAmount(amount: bigint, decimals: bigint): string {
  const whole = amount / decimals;
  const fraction = amount % decimals;
  if (fraction === 0n) {
    return whole.toString();
  }
  const fractionStr = (decimals + fraction).toString().slice(1).replace(/0+$/, "");
  return `${whole.toString()}.${fractionStr}`;
}

function createCommentCell(note: string | undefined): Cell {
  if (!note) {
    return EMPTY_CELL;
  }
  const trimmed = note.trim();
  if (!trimmed) {
    return EMPTY_CELL;
  }
  const encoder = new TextEncoder();
  return beginCell()
    .storeUint(0, 32)
    .storeBuffer(encoder.encode(trimmed))
    .endCell();
}

function createJettonTransferBody(args: {
  jettonAmount: bigint;
  destination: Address;
  responseDestination: Address;
  forwardTonAmount: bigint;
  forwardPayload: Cell;
  queryId: bigint;
}): Cell {
  return beginCell()
    .storeUint(OP_JETTON_TRANSFER, 32)
    .storeUint(args.queryId, 64)
    .storeCoins(args.jettonAmount)
    .storeAddress(args.destination)
    .storeAddress(args.responseDestination)
    .storeMaybeRef(null)
    .storeCoins(args.forwardTonAmount)
    .storeRef(args.forwardPayload)
    .endCell();
}

async function waitForSeqno(
  wallet: OpenedContract<WalletContractV4>,
  expectedSeqno: number,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await wallet.getSeqno();
    if (current >= expectedSeqno) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(
    `Timed out waiting for wallet seqno ${expectedSeqno} (last observed ${await wallet.getSeqno()})`,
  );
}

function computeDistributionEntries(
  plan: DistributionPlanConfig,
  decimals: bigint,
  factor: bigint,
): DistributionEntry[] {
  const totalTokens = toBigInt(plan.totalSupply, "totalSupply");
  const totalAtomic = totalTokens * factor;

  let allocatedAtomic = 0n;

  const entries = plan.targets.map((target) => {
    const address = ensureAddress(target.address, target.label);
    let atomicAmount: bigint;
    let percent: number | undefined;

    if (target.tokens !== undefined) {
      atomicAmount = toBigInt(target.tokens, `${target.label} tokens`) * factor;
    } else if (target.percent !== undefined) {
      if (!Number.isFinite(target.percent) || target.percent < 0) {
        throw new Error(`${target.label} percent must be a non-negative number`);
      }
      percent = target.percent;
      atomicAmount = (totalAtomic * BigInt(Math.round(target.percent * 100))) /
        (100n * 100n);
      // Avoid floating rounding by recalculating using decimals if percent is integer
      if (Number.isInteger(target.percent)) {
        atomicAmount = (totalAtomic * BigInt(target.percent)) / 100n;
      }
    } else {
      throw new Error(
        `${target.label} must define either "tokens" or "percent" allocation`,
      );
    }

    if (atomicAmount <= 0n) {
      throw new Error(`${target.label} allocation must be positive`);
    }

    allocatedAtomic += atomicAmount;

    const tonAmount = target.tonValue
      ? toNano(target.tonValue)
      : toNano(plan.tonFee ?? DEFAULT_TON_FEE);

    return {
      label: target.label,
      address,
      amount: atomicAmount,
      humanAmount: formatAmount(atomicAmount, factor),
      percent,
      note: target.note,
      tonAmount,
    } satisfies DistributionEntry;
  });

  if (allocatedAtomic !== totalAtomic) {
    throw new Error(
      `Distribution mismatch: allocated ${allocatedAtomic.toString()} but total supply is ${totalAtomic.toString()}`,
    );
  }

  return entries;
}

function chunkDistributions(
  entries: DistributionEntry[],
  batchSize: number,
  initialSeqno: number,
): DistributionBatch[] {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("batch size must be a positive integer");
  }
  if (batchSize > 4) {
    throw new Error("batch size cannot exceed 4 messages per seqno");
  }

  const batches: DistributionBatch[] = [];
  let index = 0;
  let seqno = initialSeqno;

  while (index < entries.length) {
    const slice = entries.slice(index, index + batchSize);
    batches.push({ seqno, entries: slice });
    index += slice.length;
    seqno += 1;
  }

  return batches;
}

function printDistributionSummary(entries: DistributionEntry[], decimals: bigint) {
  const rows = entries.map((entry) => ({
    Label: entry.label,
    Address: entry.address.toString(),
    Amount: entry.humanAmount,
    Percent: entry.percent !== undefined ? `${entry.percent}%` : "—",
    Note: entry.note ?? "",
  }));
  console.table(rows);
  const total = entries.reduce((acc, entry) => acc + entry.amount, 0n);
  console.log(
    `Total allocated: ${formatAmount(total, decimals)} tokens (atomic ${total.toString()})`,
  );
}

function normalizeMnemonicWords(value: string): string[] {
  const words = value.trim().split(/\s+/);
  if (words.length < 12) {
    throw new Error(
      "mnemonic must contain at least 12 words — set via --mnemonic, --mnemonic-file, or environment variable",
    );
  }
  return words;
}

function extractMnemonic(
  options: CliOptions,
  plan: DistributionPlanConfig,
): string[] | null {
  const mnemonicEnvName = options["mnemonic-env"] ?? plan.mnemonicEnv ??
    DEFAULT_MNEMONIC_ENV;
  if (options.mnemonic) {
    return normalizeMnemonicWords(options.mnemonic);
  }
  if (options["mnemonic-file"]) {
    const path = options["mnemonic-file"]!;
    const text = Deno.readTextFileSync(path);
    return normalizeMnemonicWords(text);
  }
  const envValue = mnemonicEnvName
    ? Deno.env.get(mnemonicEnvName)
    : undefined;
  if (envValue) {
    return normalizeMnemonicWords(envValue);
  }
  return null;
}

function extractApiKey(
  options: CliOptions,
  plan: DistributionPlanConfig,
): string | undefined {
  if (options["api-key"]) {
    return options["api-key"]!;
  }
  const envName = plan.tonApiKeyEnv ?? DEFAULT_API_KEY_ENV;
  return envName ? Deno.env.get(envName) ?? undefined : undefined;
}

function generateQueryId(): bigint {
  const buffer = new Uint8Array(8);
  crypto.getRandomValues(buffer);
  return buffer.reduce((acc, value) => (acc << 8n) | BigInt(value), 0n);
}

async function main() {
  const options = readCliOptions();
  const projectRoot = resolveProjectRoot(import.meta.url);
  const planPath = options.plan
    ? (options.plan.startsWith("/")
      ? options.plan
      : join(Deno.cwd(), options.plan))
    : join(projectRoot, DEFAULT_PLAN_PATH);

  const plan = await readDistributionPlan(planPath);

  const decimalsValue = plan.decimals !== undefined
    ? BigInt(plan.decimals)
    : undefined;
  const decimals = decimalsValue ?? 9n;
  const factor = 10n ** decimals;

  const entries = computeDistributionEntries(plan, decimals, factor);
  printDistributionSummary(entries, factor);

  if (options.dryRun) {
    console.log("Dry run mode enabled — no transactions were submitted.");
    return;
  }

  const mnemonicWords = extractMnemonic(options, plan);
  if (!mnemonicWords) {
    throw new Error(
      "mnemonic not provided — pass via --mnemonic, --mnemonic-file, or set the configured environment variable",
    );
  }

  const endpoint = options.endpoint ?? plan.tonEndpoint ?? DEFAULT_ENDPOINT;
  const apiKey = extractApiKey(options, plan);

  const client = new TonClient({ endpoint, apiKey });

  const controllerWalletAddress = ensureAddress(
    plan.controllerWallet,
    "controllerWallet",
  );
  const jettonMasterAddress = ensureAddress(plan.jettonMaster, "jettonMaster");

  const keyPair = await mnemonicToPrivateKey(mnemonicWords);
  const walletContract = WalletContractV4.create({
    workchain: controllerWalletAddress.workChain,
    publicKey: keyPair.publicKey,
  });
  const wallet = client.open(walletContract);

  if (!walletContract.address.equals(controllerWalletAddress)) {
    throw new Error(
      `Mnemonic does not match controller wallet. Derived ${walletContract.address.toString()}, expected ${controllerWalletAddress.toString()}`,
    );
  }

  const master = client.open(JettonMaster.create(jettonMasterAddress));
  const controllerJettonWalletAddress = await master.getWalletAddress(
    controllerWalletAddress,
  );

  const desiredBatchSize = options["batch-size"] ?? plan.batchSize ?? 1;
  if (!Number.isInteger(desiredBatchSize) || desiredBatchSize <= 0) {
    throw new Error("batch size must be a positive integer");
  }

  const initialSeqno = await wallet.getSeqno();
  const batches = chunkDistributions(entries, desiredBatchSize, initialSeqno);

  console.log(
    `Submitting ${entries.length} transfers across ${batches.length} seqno steps starting from ${initialSeqno} using endpoint ${endpoint}`,
  );

  for (const batch of batches) {
    const messages = batch.entries.map((entry) => {
      const body = createJettonTransferBody({
        jettonAmount: entry.amount,
        destination: entry.address,
        responseDestination: controllerWalletAddress,
        forwardTonAmount: 0n,
        forwardPayload: createCommentCell(entry.note),
        queryId: generateQueryId(),
      });

      return internal({
        to: controllerJettonWalletAddress,
        value: entry.tonAmount,
        bounce: true,
        body,
      });
    });

    await wallet.sendTransfer({
      seqno: batch.seqno,
      secretKey: keyPair.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      messages,
    });

    for (const entry of batch.entries) {
      console.log(
        `→ ${entry.label}: ${entry.humanAmount} tokens (${entry.amount.toString()} atomic) [seqno ${batch.seqno}]`,
      );
    }

    await waitForSeqno(wallet, batch.seqno + 1, 120_000, 1_500);
  }

  console.log("✅ Distribution submitted. Publish tx hashes for transparency.");
}

if (import.meta.main) {
  await main();
}
