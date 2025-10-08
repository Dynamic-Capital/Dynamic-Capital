import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

interface ChunkOptions {
  inputPath: string;
  outputPath: string;
  chunkSize: number;
  overlap: number;
  idPrefix: string;
  sourcePath?: string;
}

interface ChunkRecord {
  chunk_id: string;
  source_path: string;
  content: string;
  token_count: number;
  start_index: number;
  end_index: number;
  created_at: string;
}

function parseArgs(argv: string[]): ChunkOptions {
  if (!argv.length) {
    throw new Error("Provide a path to the text file you want to chunk");
  }

  let inputPath = "";
  let outputPath = "";
  let chunkSize = 800;
  let overlap = 120;
  let idPrefix = "chunk";
  let sourcePath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--input" || value === "-i") {
      const next = argv[index + 1];
      if (!next) throw new Error("--input flag requires a path");
      inputPath = next;
      index += 1;
      continue;
    }
    if (value === "--out" || value === "-o") {
      const next = argv[index + 1];
      if (!next) throw new Error("--out flag requires a path");
      outputPath = next;
      index += 1;
      continue;
    }
    if (value === "--chunk-size") {
      const next = Number(argv[index + 1]);
      if (!Number.isFinite(next) || next <= 0) {
        throw new Error("--chunk-size must be a positive integer");
      }
      chunkSize = Math.floor(next);
      index += 1;
      continue;
    }
    if (value === "--overlap") {
      const next = Number(argv[index + 1]);
      if (!Number.isFinite(next) || next < 0) {
        throw new Error("--overlap must be a non-negative integer");
      }
      overlap = Math.floor(next);
      index += 1;
      continue;
    }
    if (value === "--prefix") {
      const next = argv[index + 1];
      if (!next) throw new Error("--prefix flag requires a value");
      idPrefix = next;
      index += 1;
      continue;
    }
    if (value === "--source") {
      const next = argv[index + 1];
      if (!next) throw new Error("--source flag requires a value");
      sourcePath = next;
      index += 1;
      continue;
    }
    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
    if (!inputPath) {
      inputPath = value;
      continue;
    }
    if (!outputPath) {
      outputPath = value;
      continue;
    }
  }

  if (!inputPath) {
    throw new Error("Missing input file path");
  }

  const resolvedInput = resolve(inputPath);
  const resolvedOutput = outputPath
    ? resolve(outputPath)
    : `${resolvedInput.replace(/\.[^.]+$/, "")}.chunks.jsonl`;

  if (overlap >= chunkSize) {
    throw new Error("--overlap must be smaller than --chunk-size");
  }

  return {
    inputPath: resolvedInput,
    outputPath: resolvedOutput,
    chunkSize,
    overlap,
    idPrefix,
    sourcePath,
  };
}

function sanitise(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function buildChunks(content: string, options: ChunkOptions): ChunkRecord[] {
  const cleaned = sanitise(content);
  if (!cleaned) {
    return [];
  }
  const tokens = cleaned.split(/\s+/);
  const chunks: ChunkRecord[] = [];
  const projectRoot = process.cwd();
  const sourcePath = options.sourcePath
    ? options.sourcePath
    : relative(projectRoot, options.inputPath) || options.inputPath;
  const timestamp = new Date().toISOString();

  for (
    let index = 0;
    index < tokens.length;
    index += options.chunkSize - options.overlap
  ) {
    const slice = tokens.slice(index, index + options.chunkSize);
    if (!slice.length) {
      break;
    }
    const chunkId = `${options.idPrefix}-${chunks.length + 1}`;
    const contentSlice = slice.join(" ");
    const record: ChunkRecord = {
      chunk_id: chunkId,
      source_path: sourcePath,
      content: contentSlice,
      token_count: slice.length,
      start_index: index,
      end_index: Math.min(tokens.length, index + options.chunkSize) - 1,
      created_at: timestamp,
    };
    chunks.push(record);
    if (index + options.chunkSize >= tokens.length) {
      break;
    }
  }

  return chunks;
}

async function ensureFileDirectory(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const input = await readFile(options.inputPath, "utf8");
  const stats = await stat(options.inputPath);
  const chunks = buildChunks(input, options);

  await ensureFileDirectory(options.outputPath);
  const lines = chunks.map((chunk) =>
    JSON.stringify({
      ...chunk,
      source_modified_at: stats.mtime.toISOString(),
    })
  );
  await writeFile(options.outputPath, `${lines.join("\n")}\n`);

  console.log(
    `Generated ${chunks.length} chunk${chunks.length === 1 ? "" : "s"} from ${
      relative(process.cwd(), options.inputPath)
    }`,
  );
  console.log(
    `Output written to ${relative(process.cwd(), options.outputPath)}`,
  );
}

main().catch((error) => {
  console.error("[chunk:text] Unable to create knowledge base chunks");
  console.error(error);
  process.exitCode = 1;
});
