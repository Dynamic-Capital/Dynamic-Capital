import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import ton from "@ton/core";

const { Cell, beginCell, storeStateInit } = ton;

type AccountRaw = {
  address?: string;
  balance?: number | string;
  code?: string | null;
  data?: string | null;
};

type Summary = {
  address: string | null;
  balanceTon: number | null;
  codeHash: string | null;
  dataHash: string | null;
  stateInitHash: string | null;
  asciiHints: string[];
};

function normaliseInputPath(input: string): string {
  if (!input || input.trim().length === 0) {
    throw new Error("Provide a JSON file path or pass data via STDIN.");
  }
  return path.resolve(process.cwd(), input.trim());
}

function isLikelyHex(value: string): boolean {
  return /^[0-9a-fA-F]+$/.test(value);
}

function decodeBoc(value: string | null | undefined): Cell | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let bytes: Buffer;
  if (isLikelyHex(trimmed)) {
    bytes = Buffer.from(trimmed, "hex");
  } else {
    const normalised = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    bytes = Buffer.from(normalised, "base64");
  }

  const cells = Cell.fromBoc(bytes);
  if (!cells.length) {
    throw new Error("BOC decoding returned no cells.");
  }
  return cells[0]!;
}

function toHex(buffer: Uint8Array | null | undefined): string | null {
  if (!buffer) return null;
  return Buffer.from(buffer).toString("hex");
}

function deriveAsciiHints(cell: Cell | null): string[] {
  if (!cell) return [];
  const bytes = Buffer.from(cell.toBoc());
  const hints: string[] = [];
  let current = "";
  const pushCurrent = () => {
    if (current.length >= 12) {
      hints.push(current);
    }
    current = "";
  };

  for (const byte of bytes) {
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      pushCurrent();
    }
  }
  pushCurrent();

  return [...new Set(hints)];
}

function summariseAccount(raw: AccountRaw): Summary {
  const address = typeof raw.address === "string" ? raw.address.trim() : null;
  const balanceNumeric = raw.balance ?? null;
  const balanceTon = balanceNumeric === null || balanceNumeric === undefined
    ? null
    : Number(balanceNumeric) / 1_000_000_000;

  const codeCell = decodeBoc(raw.code ?? null);
  const dataCell = decodeBoc(raw.data ?? null);

  const codeHash = codeCell ? toHex(codeCell.hash()) : null;
  const dataHash = dataCell ? toHex(dataCell.hash()) : null;

  let stateInitHash: string | null = null;
  if (codeCell || dataCell) {
    const initCell = beginCell()
      .store(storeStateInit({
        code: codeCell ?? undefined,
        data: dataCell ?? undefined,
      }))
      .endCell();
    stateInitHash = toHex(initCell.hash());
  }

  const asciiHints = [
    ...deriveAsciiHints(codeCell),
    ...deriveAsciiHints(dataCell),
  ];

  return {
    address,
    balanceTon: Number.isFinite(balanceTon) ? balanceTon : null,
    codeHash,
    dataHash,
    stateInitHash,
    asciiHints,
  };
}

async function readInput(): Promise<AccountRaw> {
  const [, , maybePath] = process.argv;

  if (maybePath && maybePath !== "-") {
    const resolved = normaliseInputPath(maybePath);
    const contents = await fs.readFile(resolved, "utf8");
    return JSON.parse(contents) as AccountRaw;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    throw new Error(
      "No input provided. Pass a file path or pipe JSON to STDIN.",
    );
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as AccountRaw;
}

function formatSummary(summary: Summary): string {
  const lines = [
    "Account summary:",
    `  Address: ${summary.address ?? "<unknown>"}`,
    `  Balance: ${
      summary.balanceTon !== null
        ? summary.balanceTon.toFixed(9) + " TON"
        : "<unknown>"
    }`,
    `  Code hash: ${summary.codeHash ?? "<missing>"}`,
    `  Data hash: ${summary.dataHash ?? "<missing>"}`,
    `  State init hash: ${summary.stateInitHash ?? "<missing>"}`,
  ];

  if (summary.asciiHints.length > 0) {
    lines.push("  ASCII hints:");
    for (const hint of summary.asciiHints) {
      lines.push(`    • ${hint}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  try {
    const raw = await readInput();
    const summary = summariseAccount(raw);
    console.log(formatSummary(summary));
  } catch (error) {
    console.error("[inspect-account-raw]", (error as Error).message);
    process.exitCode = 1;
  }
}

await main();
