#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import process from "node:process";
import { Cell } from "@ton/core";

type InputEncoding = "hex" | "base64" | "binary";

type LoadedInput = {
  source: string;
  encoding: InputEncoding;
  buffer: Buffer;
};

function normalizeBase64(value: string): string {
  const cleaned = value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (cleaned.length % 4)) % 4;
  return cleaned + "=".repeat(padLength);
}

function looksLikeHex(value: string): boolean {
  return value.length > 0 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value);
}

async function loadInput(raw: string): Promise<LoadedInput> {
  try {
    const stats = await stat(raw);
    if (stats.isFile()) {
      const buffer = await readFile(raw);
      return { source: basename(raw), encoding: "binary", buffer };
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT" && code !== "ENAMETOOLONG") {
      throw error;
    }
  }

  const trimmed = raw.trim();
  if (looksLikeHex(trimmed)) {
    return { source: "<hex>", encoding: "hex", buffer: Buffer.from(trimmed, "hex") };
  }

  const normalized = normalizeBase64(trimmed);
  try {
    return {
      source: "<base64>",
      encoding: "base64",
      buffer: Buffer.from(normalized, "base64"),
    };
  } catch (error) {
    throw new Error(
      "Input is neither a readable file path nor a valid hex/base64 bag-of-cells payload.",
    );
  }
}

function assignCellIds(root: Cell): Map<Cell, number> {
  const ids = new Map<Cell, number>();
  let nextId = 0;
  const stack: Cell[] = [root];
  while (stack.length > 0) {
    const cell = stack.pop()!;
    if (ids.has(cell)) {
      continue;
    }
    ids.set(cell, nextId++);
    for (const ref of cell.refs) {
      stack.push(ref);
    }
  }
  return ids;
}

function tryExtractBytes(cell: Cell): Buffer | null {
  const buffer = cell.bits.subbuffer(0, cell.bits.length);
  return buffer ?? null;
}

function maybePrintable(buffer: Buffer): string | null {
  if (buffer.length === 0) {
    return null;
  }
  const text = buffer.toString("utf8");
  return /^[\x09\x0A\x0D\x20-\x7E]*$/.test(text) ? text : null;
}

function summarize(value: string, maxLength = 160): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
}

function renderCell(
  cell: Cell,
  ids: Map<Cell, number>,
  indent = "",
  visited = new Set<Cell>(),
): void {
  const cellId = ids.get(cell);
  if (cellId === undefined) {
    throw new Error("Encountered an unindexed cell while rendering.");
  }
  const prefix = indent.length === 0 ? "" : indent;
  const header = `${prefix}Cell #${cellId}`;
  if (visited.has(cell)) {
    console.log(`${header} (see above)`);
    return;
  }
  visited.add(cell);
  console.log(header);
  console.log(`${indent}  Hash : ${cell.hash().toString("hex")}`);
  console.log(`${indent}  Type : ${cell.isExotic ? "exotic" : "ordinary"}`);
  console.log(`${indent}  Level: ${cell.level()}`);
  console.log(`${indent}  Depth: ${cell.depth()}`);
  const bitsText = summarize(cell.bits.toString());
  console.log(`${indent}  Bits : ${cell.bits.length} (${bitsText})`);
  const bytes = tryExtractBytes(cell);
  if (bytes) {
    console.log(`${indent}  Bytes: ${summarize(bytes.toString("hex"))}`);
    const printable = maybePrintable(bytes);
    if (printable) {
      console.log(`${indent}  Text : ${printable}`);
    }
  }
  if (cell.refs.length === 0) {
    console.log(`${indent}  Refs : —`);
    return;
  }
  const refIds = cell.refs.map((ref) => `#${ids.get(ref)}`);
  console.log(`${indent}  Refs : ${refIds.join(", ")}`);
  cell.refs.forEach((ref, index) => {
    const childId = ids.get(ref);
    const branchLabel = `${indent}  ↳ Ref ${index}: #${childId}`;
    if (!childId && childId !== 0) {
      throw new Error("Encountered an unindexed reference while rendering.");
    }
    if (visited.has(ref)) {
      console.log(`${branchLabel} (see above)`);
      return;
    }
    console.log(branchLabel);
    renderCell(ref, ids, `${indent}      `, visited);
  });
}

function printUsage(): void {
  console.log(`Usage: tsx inspect-boc.ts <hex | base64 | path-to-boc>`);
  console.log("\nExamples:");
  console.log("  tsx inspect-boc.ts ./build/master.boc");
  console.log("  tsx inspect-boc.ts b5ee9c720102...");
  console.log("  tsx inspect-boc.ts te6ccgEBAQEA...");
}

async function main(): Promise<void> {
  const [, , ...args] = process.argv;
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    if (args.length === 0) {
      process.exitCode = 1;
    }
    return;
  }

  const rawInput = args[0]!;
  let loaded: LoadedInput;
  try {
    loaded = await loadInput(rawInput);
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
    return;
  }

  let cells: Cell[];
  try {
    cells = Cell.fromBoc(loaded.buffer);
  } catch (error) {
    console.error("Failed to parse Bag-of-Cells payload:");
    console.error((error as Error).message);
    process.exitCode = 1;
    return;
  }

  if (cells.length === 0) {
    console.error("The supplied Bag-of-Cells payload is empty.");
    process.exitCode = 1;
    return;
  }

  console.log(`Decoded ${cells.length} root cell${cells.length === 1 ? "" : "s"} from ${loaded.source} (${loaded.encoding}).`);
  cells.forEach((root, rootIndex) => {
    const ids = assignCellIds(root);
    console.log(`\nRoot #${rootIndex}`);
    renderCell(root, ids);
  });
}

await main();
