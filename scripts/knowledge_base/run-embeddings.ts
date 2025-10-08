import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { OpenAIEmbeddings } from "@langchain/openai";

interface CliOptions {
  mode: "build" | "refresh";
  sources: string[];
  output: string;
  model: string;
  batchSize: number;
  dryRun: boolean;
}

interface ChunkDocument {
  chunk_id: string;
  source_path: string;
  content: string;
  token_count?: number;
  [key: string]: unknown;
}

interface EmbeddingRecord {
  chunk_id: string;
  source_path: string;
  embedding: number[];
  model: string;
  token_count?: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  let mode: "build" | "refresh" = "build";

  const first = args[0];
  if (first === "build" || first === "refresh") {
    mode = first;
    args.shift();
  }

  const sources: string[] = [];
  let output = "";
  let model = "text-embedding-3-small";
  let batchSize = 32;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--input" || value === "-i") {
      const next = args[index + 1];
      if (!next) throw new Error("--input flag requires a path");
      sources.push(next);
      index += 1;
      continue;
    }
    if (value === "--out" || value === "-o") {
      const next = args[index + 1];
      if (!next) throw new Error("--out flag requires a file path");
      output = next;
      index += 1;
      continue;
    }
    if (value === "--model") {
      const next = args[index + 1];
      if (!next) throw new Error("--model flag requires a value");
      model = next;
      index += 1;
      continue;
    }
    if (value === "--batch") {
      const nextValue = Number(args[index + 1]);
      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        throw new Error("--batch must be a positive integer");
      }
      batchSize = Math.max(1, Math.floor(nextValue));
      index += 1;
      continue;
    }
    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
    sources.push(value);
  }

  if (!sources.length) {
    throw new Error(
      "Provide at least one chunk source (JSONL file or directory)",
    );
  }

  const resolvedSources = sources.map((entry) => resolve(entry));
  const defaultOutput = join(
    process.cwd(),
    "data/knowledge_base/embeddings",
    `${mode}-${Date.now()}.jsonl`,
  );
  const resolvedOutput = output ? resolve(output) : defaultOutput;

  return {
    mode,
    sources: resolvedSources,
    output: resolvedOutput,
    model,
    batchSize,
    dryRun,
  };
}

async function collectJsonlFiles(entry: string): Promise<string[]> {
  const stats = await stat(entry);
  if (stats.isDirectory()) {
    const children = await readdir(entry);
    const nested = await Promise.all(
      children.map((child) => collectJsonlFiles(join(entry, child))),
    );
    return nested.flat();
  }

  if (stats.isFile() && extname(entry).toLowerCase() === ".jsonl") {
    return [entry];
  }

  return [];
}

async function loadChunks(paths: string[]): Promise<ChunkDocument[]> {
  const documents: ChunkDocument[] = [];
  for (const path of paths) {
    const content = await readFile(path, "utf8");
    const lines = content.split(/\r?\n/).filter((line) =>
      line.trim().length > 0
    );
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as ChunkDocument;
        if (
          typeof parsed.chunk_id === "string" &&
          typeof parsed.content === "string"
        ) {
          documents.push(parsed);
        }
      } catch (error) {
        console.warn(`[embeddings] Skipping malformed line in ${path}:`, error);
      }
    }
  }
  return documents;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
}

async function ensureOutputDirectory(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function embedChunks(
  chunks: ChunkDocument[],
  options: CliOptions,
): Promise<EmbeddingRecord[]> {
  const timestamp = new Date().toISOString();
  if (chunks.length === 0) {
    return [];
  }

  if (options.dryRun) {
    return chunks.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      source_path: chunk.source_path,
      embedding: [],
      model: options.model,
      token_count: chunk.token_count,
      metadata: {},
      created_at: timestamp,
    }));
  }

  const apiKey = requireEnv("OPENAI_API_KEY");
  const embeddings = new OpenAIEmbeddings({
    apiKey,
    model: options.model,
    stripNewLines: true,
  });

  const records: EmbeddingRecord[] = [];
  for (let index = 0; index < chunks.length; index += options.batchSize) {
    const batch = chunks.slice(index, index + options.batchSize);
    const texts = batch.map((chunk) => chunk.content);
    const vectors = await embeddings.embedDocuments(texts);
    for (let offset = 0; offset < batch.length; offset += 1) {
      const chunk = batch[offset];
      const vector = vectors[offset];
      records.push({
        chunk_id: chunk.chunk_id,
        source_path: chunk.source_path,
        embedding: vector,
        model: options.model,
        token_count: chunk.token_count,
        metadata: Object.fromEntries(
          Object.entries(chunk).filter(([key]) =>
            ![
              "chunk_id",
              "source_path",
              "content",
              "token_count",
            ].includes(key)
          ),
        ),
        created_at: timestamp,
      });
    }
  }

  return records;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const fileSets = await Promise.all(options.sources.map(collectJsonlFiles));
  const files = [...new Set(fileSets.flat())];

  if (!files.length) {
    console.warn("No JSONL chunk files found in the provided paths");
    return;
  }

  const chunks = await loadChunks(files);
  const records = await embedChunks(chunks, options);
  await ensureOutputDirectory(options.output);

  const repoRoot = process.cwd();
  const lines = records.map((record) =>
    JSON.stringify({
      ...record,
      relative_source_path: relative(repoRoot, record.source_path),
    })
  );
  await writeFile(options.output, `${lines.join("\n")}\n`);

  console.log(
    `${
      options.mode === "refresh" ? "Refreshed" : "Generated"
    } ${records.length} embeddings using ${options.model}`,
  );
  console.log(`Output written to ${relative(repoRoot, options.output)}`);
}

main().catch((error) => {
  console.error(
    "[embeddings] Failed to build embeddings for knowledge base chunks",
  );
  console.error(error);
  process.exitCode = 1;
});
