#!/usr/bin/env -S deno run -A

import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import { Buffer } from "node:buffer";
import { BitString, Cell, CellType } from "npm:@ton/core";

if (!globalThis.Buffer) {
  // @ts-ignore Assign Buffer polyfill for npm packages under Deno
  globalThis.Buffer = Buffer;
}

type EncodingMode = "auto" | "base64" | "hex" | "raw";
type EffectiveEncoding = "base64" | "hex" | "raw";
type BitsFormat = "all" | "hex" | "binary" | "none";

interface CliOptions {
  boc?: string;
  file?: string;
  encoding: EncodingMode;
  compact: boolean;
  tree: boolean;
  help: boolean;
  output?: string;
  indent: number;
  treeDepth: number;
  bitsFormat: BitsFormat;
}

interface ParsedInput {
  bytes: Uint8Array;
  encoding: EffectiveEncoding;
  source: string;
}

interface BitsReport {
  length: number;
  trailingUnusedBits: number;
  hex?: string;
  binary?: string;
}

interface CellReport {
  id: number;
  type: string;
  isExotic: boolean;
  level: number;
  depth: number;
  hash: string;
  bits: BitsReport;
  refs: number[];
}

interface BocStats {
  maxDepth: number;
  minDepth: number;
  averageDepth: number;
  maxRefCount: number;
  maxBitsLength: number;
  exoticCellCount: number;
  cellTypes: Record<string, number>;
}

interface BocReport {
  schemaVersion: number;
  generatedAt: string;
  source: string;
  encoding: EffectiveEncoding;
  size: number;
  rootCount: number;
  cellCount: number;
  stats: BocStats;
  roots: Array<{ id: number; hash: string; depth: number }>;
  cells: CellReport[];
}

interface CellGraph {
  orderedCells: Cell[];
  idMap: Map<Cell, number>;
  rootIds: number[];
}

const CELL_TYPE_LABELS: Record<number, string> = {
  [CellType.Ordinary]: "ordinary",
  [CellType.PrunedBranch]: "pruned-branch",
  [CellType.Library]: "library",
  [CellType.MerkleProof]: "merkle-proof",
  [CellType.MerkleUpdate]: "merkle-update",
};

const VALID_BITS_FORMATS: BitsFormat[] = ["all", "hex", "binary", "none"];
const REPORT_SCHEMA_VERSION = 1;

function printUsage(): void {
  console.error(`Usage: decode-boc.ts [options] [boc]

Options:
  --boc, -b <value>        Base64 or hex encoded BOC string
  --file, -f <path>        Read BOC data from a file
  --encoding, -e <mode>    Input encoding: auto (default), base64, hex, raw
  --output, -o <path>      Write the JSON report to the provided path
  --indent, -i <value>     Indent level for JSON output (default: 2)
  --compact, -c            Minify JSON output instead of pretty-printing
  --bits, -B <mode>        Bits detail: all (default), hex, binary, none
  --tree, -t               Print the textual cell tree after the JSON report
  --tree-depth, -T <value> Limit tree expansion depth (0 = unlimited, default)
  --help, -h               Show this message

You can also pipe data via stdin. If no --boc or --file is provided the
script reads from stdin.`);
}

function parseCliOptions(): CliOptions {
  const parsed = parse(Deno.args, {
    string: [
      "boc",
      "file",
      "encoding",
      "output",
      "indent",
      "tree-depth",
      "bits",
    ],
    boolean: ["help", "tree", "compact"],
    alias: {
      boc: "b",
      file: "f",
      encoding: "e",
      output: "o",
      indent: "i",
      tree: "t",
      compact: "c",
      help: "h",
      "tree-depth": "T",
      bits: "B",
    },
    default: {
      encoding: "auto",
    },
  });

  const positional = parsed._.map((value) => String(value)).filter((value) =>
    value.length > 0
  );

  const options: CliOptions = {
    boc: typeof parsed.boc === "string" ? parsed.boc : positional[0],
    file: typeof parsed.file === "string" ? parsed.file : undefined,
    encoding: parseEncoding(parsed.encoding),
    compact: Boolean(parsed.compact ?? false),
    tree: Boolean(parsed.tree ?? false),
    help: Boolean(parsed.help ?? false),
    output: typeof parsed.output === "string" && parsed.output.length > 0
      ? parsed.output
      : undefined,
    indent: parseIndent(parsed.indent),
    treeDepth: parseTreeDepth(parsed["tree-depth"]),
    bitsFormat: parseBitsFormat(parsed.bits),
  };

  return options;
}

function parseEncoding(value: unknown): EncodingMode {
  if (value === undefined) {
    return "auto";
  }
  if (
    value === "auto" || value === "base64" || value === "hex" || value === "raw"
  ) {
    return value;
  }
  throw new Error(`Unsupported encoding mode: ${String(value)}`);
}

function parseIndent(value: unknown): number {
  if (value === undefined) {
    return 2;
  }
  const indent = Number.parseInt(String(value), 10);
  if (!Number.isFinite(indent) || Number.isNaN(indent) || indent < 0) {
    throw new Error(`Invalid indent value: ${String(value)}`);
  }
  return indent;
}

function parseTreeDepth(value: unknown): number {
  if (value === undefined) {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid tree depth: ${String(value)}`);
  }
  if (parsed === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return parsed;
}

function parseBitsFormat(value: unknown): BitsFormat {
  if (value === undefined) {
    return "all";
  }
  const normalized = String(value).toLowerCase();
  if (VALID_BITS_FORMATS.includes(normalized as BitsFormat)) {
    return normalized as BitsFormat;
  }
  throw new Error(
    `Invalid bits format: ${String(value)}. Expected one of ${VALID_BITS_FORMATS.join(", ")}.`,
  );
}

async function readInput(options: CliOptions): Promise<ParsedInput> {
  if (options.boc && options.file) {
    throw new Error("Provide either --boc or --file, not both.");
  }

  if (options.boc) {
    return decodeStringInput(options.boc, options.encoding, "CLI argument");
  }

  if (options.file) {
    if (options.encoding === "raw") {
      const bytes = await Deno.readFile(options.file);
      return { bytes, encoding: "raw", source: options.file };
    }
    const text = await Deno.readTextFile(options.file);
    return decodeStringInput(text, options.encoding, options.file);
  }

  const stdinText = (await new Response(Deno.stdin.readable).text()).trim();
  if (!stdinText) {
    throw new Error(
      "No BOC data provided. Use --boc, --file, or pipe data via stdin.",
    );
  }
  return decodeStringInput(stdinText, options.encoding, "stdin");
}

function decodeStringInput(
  value: string,
  mode: EncodingMode,
  source: string,
): ParsedInput {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Input from ${source} is empty.`);
  }

  if (mode === "raw") {
    const bytes = new TextEncoder().encode(value);
    return { bytes, encoding: "raw", source };
  }

  const sanitized = value.replace(/\s+/g, "");
  if (!sanitized) {
    throw new Error(`Input from ${source} does not contain decodable data.`);
  }

  const effectiveMode = mode === "auto" ? detectEncoding(sanitized) : mode;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(sanitized, effectiveMode);
  } catch (error) {
    throw new Error(
      `Failed to decode ${source} as ${effectiveMode}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (buffer.length === 0) {
    throw new Error(`Decoded ${source} produced 0 bytes.`);
  }

  return { bytes: buffer, encoding: effectiveMode, source };
}

function detectEncoding(value: string): EffectiveEncoding {
  const isHex = value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value);
  if (isHex) {
    return "hex";
  }
  return "base64";
}

function buildCellGraph(roots: Cell[]): CellGraph {
  const idMap = new Map<Cell, number>();
  const queue: Cell[] = [];

  for (const root of roots) {
    if (!idMap.has(root)) {
      const id = idMap.size;
      idMap.set(root, id);
      queue.push(root);
    }
  }

  while (queue.length > 0) {
    const cell = queue.shift()!;
    for (const ref of cell.refs) {
      if (!idMap.has(ref)) {
        const id = idMap.size;
        idMap.set(ref, id);
        queue.push(ref);
      }
    }
  }

  const orderedCells = Array.from(idMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([cell]) => cell);

  const rootIds = roots.map((root) => idMap.get(root) ?? -1).filter((id) =>
    id >= 0
  );

  return { orderedCells, idMap, rootIds };
}

function createReport(
  input: ParsedInput,
  graph: CellGraph,
  bitsFormat: BitsFormat,
): BocReport {
  const cellReports = graph.orderedCells
    .map((cell, id) => createCellReport(cell, graph.idMap, id, bitsFormat));

  const rootSummaries = graph.rootIds.map((id) => {
    const cell = cellReports.find((item) => item.id === id);
    if (!cell) {
      throw new Error(
        `Invariant violation: missing cell report for root id ${id}`,
      );
    }
    return { id: cell.id, hash: cell.hash, depth: cell.depth };
  });

  const stats = computeStats(cellReports);

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: input.source,
    encoding: input.encoding,
    size: input.bytes.length,
    rootCount: graph.rootIds.length,
    cellCount: cellReports.length,
    stats,
    roots: rootSummaries,
    cells: cellReports,
  };
}

function createCellReport(
  cell: Cell,
  idMap: Map<Cell, number>,
  id: number,
  bitsFormat: BitsFormat,
): CellReport {
  const hashHex = toHex(cell.hash());
  const bitsInfo = summarizeBits(cell.bits, bitsFormat);

  const refs = cell.refs.map((ref) => idMap.get(ref)).filter((
    value,
  ): value is number => typeof value === "number");

  return {
    id,
    type: CELL_TYPE_LABELS[cell.type] ?? `unknown(${cell.type})`,
    isExotic: cell.isExotic,
    level: cell.level(),
    depth: cell.depth(),
    hash: hashHex,
    bits: bitsInfo,
    refs,
  };
}

function summarizeBits(bits: BitString, format: BitsFormat): BitsReport {
  const length = bits.length;
  const trailingUnusedBits = (8 - (length % 8)) % 8;
  const includeHex = format === "hex" || format === "all";
  const includeBinary = format === "binary" || format === "all";

  const report: BitsReport = {
    length,
    trailingUnusedBits,
  };

  if (includeHex) {
    report.hex = toHex(bitStringToBytes(bits));
  }

  if (includeBinary) {
    report.binary = bitsToBinaryString(bits);
  }

  return report;
}

function bitStringToBytes(bits: BitString): Uint8Array {
  const buffer = bits.subbuffer(0, bits.length);
  if (buffer) {
    return new Uint8Array(buffer);
  }

  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i += 1) {
    if (bits.at(i)) {
      bytes[i >> 3] |= 1 << (7 - (i & 7));
    }
  }
  return bytes;
}

function bitsToBinaryString(bits: BitString): string {
  const segments: string[] = [];
  let segment = "";
  for (let i = 0; i < bits.length; i += 1) {
    segment += bits.at(i) ? "1" : "0";
    if ((i & 7) === 7) {
      segments.push(segment);
      segment = "";
    }
  }
  if (segment.length > 0) {
    segments.push(segment.padEnd(8, "0"));
  }
  return segments.join(" ");
}

function toHex(buffer: Iterable<number>): string {
  const hex: string[] = [];
  for (const byte of buffer) {
    hex.push(byte.toString(16).padStart(2, "0"));
  }
  return hex.join("");
}

function computeStats(cells: CellReport[]): BocStats {
  if (cells.length === 0) {
    return {
      maxDepth: 0,
      minDepth: 0,
      averageDepth: 0,
      maxRefCount: 0,
      maxBitsLength: 0,
      exoticCellCount: 0,
      cellTypes: {},
    };
  }

  let maxDepth = 0;
  let minDepth = Number.POSITIVE_INFINITY;
  let totalDepth = 0;
  let maxRefCount = 0;
  let maxBitsLength = 0;
  let exoticCellCount = 0;
  const cellTypes: Record<string, number> = {};

  for (const cell of cells) {
    if (cell.depth > maxDepth) {
      maxDepth = cell.depth;
    }
    if (cell.depth < minDepth) {
      minDepth = cell.depth;
    }
    totalDepth += cell.depth;
    if (cell.refs.length > maxRefCount) {
      maxRefCount = cell.refs.length;
    }
    if (cell.bits.length > maxBitsLength) {
      maxBitsLength = cell.bits.length;
    }
    if (cell.isExotic) {
      exoticCellCount += 1;
    }
    cellTypes[cell.type] = (cellTypes[cell.type] ?? 0) + 1;
  }

  return {
    maxDepth,
    minDepth: minDepth === Number.POSITIVE_INFINITY ? 0 : minDepth,
    averageDepth: Number.isFinite(totalDepth / cells.length)
      ? totalDepth / cells.length
      : 0,
    maxRefCount,
    maxBitsLength,
    exoticCellCount,
    cellTypes,
  };
}

function formatCellTree(
  report: BocReport,
  rootIds: number[],
  treeDepth: number,
): string {
  if (rootIds.length === 0) {
    return "";
  }

  const maxDepth = Number.isFinite(treeDepth)
    ? treeDepth
    : Number.POSITIVE_INFINITY;
  const cellsById = new Map(report.cells.map((cell) => [cell.id, cell]));
  const visited = new Set<number>();
  const lines: string[] = [];

  rootIds.forEach((rootId, index) => {
    if (index > 0) {
      lines.push("");
    }
    lines.push(`Root ${index} (id=${rootId})`);
    const rootCell = cellsById.get(rootId);
    if (!rootCell) {
      lines.push("  [missing cell data]");
      return;
    }
    traverse(rootCell, 0, "", true);
  });

  return lines.join("\n");

  function traverse(
    cell: CellReport,
    depth: number,
    prefix: string,
    isLast: boolean,
  ): void {
    const previouslyVisited = visited.has(cell.id);
    const branchPrefix = depth === 0
      ? ""
      : `${prefix}${isLast ? "└── " : "├── "}`;
    lines.push(branchPrefix + describeCell(cell, previouslyVisited));

    const childPrefix = depth === 0
      ? ""
      : `${prefix}${isLast ? "    " : "│   "}`;

    if (previouslyVisited) {
      return;
    }

    visited.add(cell.id);

    if (depth >= maxDepth) {
      if (cell.refs.length > 0) {
        const truncatedBranch = `${childPrefix}└── `;
        const summary = `… ${cell.refs.length} ref${cell.refs.length === 1 ? "" : "s"} truncated at depth ${Number.isFinite(treeDepth) ? treeDepth : "∞"}`;
        lines.push(truncatedBranch + summary);
      }
      return;
    }

    for (let index = 0; index < cell.refs.length; index += 1) {
      const refId = cell.refs[index];
      const ref = cellsById.get(refId);
      const childIsLast = index === cell.refs.length - 1;
      if (!ref) {
        const missingPrefix = depth === 0
          ? ""
          : `${childPrefix}${childIsLast ? "└── " : "├── "}`;
        lines.push(`${missingPrefix}#${refId} [missing cell data]`);
        continue;
      }
      traverse(ref, depth + 1, childPrefix, childIsLast);
    }
  }
}

function describeCell(cell: CellReport, repeated: boolean): string {
  const parts = [
    `#${cell.id}`,
    cell.type,
    cell.isExotic ? "(exotic)" : undefined,
    `level=${cell.level}`,
    `depth=${cell.depth}`,
    `refs=${cell.refs.length}`,
    `bits=${cell.bits.length}`,
    `hash=${cell.hash.slice(0, 16)}${cell.hash.length > 16 ? "…" : ""}`,
  ];
  if (repeated) {
    parts.push("[shared]");
  }
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}

async function emitJsonReport(
  report: BocReport,
  options: CliOptions,
): Promise<void> {
  const indent = options.compact ? 0 : options.indent;
  const json = JSON.stringify(report, null, indent);

  if (options.output) {
    try {
      await Deno.writeTextFile(options.output, `${json}\n`);
    } catch (error) {
      console.error(
        error instanceof Error
          ? `Failed to write output file: ${error.message}`
          : `Failed to write output file: ${String(error)}`,
      );
      Deno.exit(1);
    }
  }

  console.log(json);
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseCliOptions();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
    return;
  }

  if (options.help) {
    printUsage();
    return;
  }

  let input: ParsedInput;
  try {
    input = await readInput(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
    return;
  }

  let roots: Cell[];
  try {
    roots = Cell.fromBoc(input.bytes);
  } catch (error) {
    console.error(
      error instanceof Error
        ? `Failed to parse BOC: ${error.message}`
        : `Failed to parse BOC: ${String(error)}`,
    );
    Deno.exit(1);
    return;
  }

  if (roots.length === 0) {
    console.error("The provided BOC does not contain any root cells.");
    Deno.exit(1);
    return;
  }

  const graph = buildCellGraph(roots);
  const report = createReport(input, graph, options.bitsFormat);
  await emitJsonReport(report, options);

  if (options.tree) {
    const treeOutput = formatCellTree(report, graph.rootIds, options.treeDepth);
    if (treeOutput.trim().length > 0) {
      console.log("\n# Cell tree");
      console.log(treeOutput);
    }
  }
}

if (import.meta.main) {
  await main();
}
