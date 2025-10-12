import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { compileFunc } from "@ton-community/func-js";
import { Cell } from "@ton/core";

import { TON_MAINNET_JETTON_MASTER } from "../../shared/ton/mainnet-addresses";

const HELP_MESSAGE =
  `Usage: npx tsx scripts/ton/run-func-verification.ts [--network mainnet|testnet]\n\n` +
  "Compiles the Dynamic Capital FunC contracts and compares the code cell hash against the on-chain deployment.";

const TONCENTER_ENDPOINT = "https://toncenter.com/api/v2/getAddressInformation";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const contractsRoot = resolve(projectRoot, "dynamic-capital-ton", "contracts");
const dataDir = resolve(projectRoot, "data");
const execFileAsync = promisify(execFile);

interface CliOptions {
  network: Network;
}

type Network = "mainnet" | "testnet";

type ContractDefinition = {
  readonly name: string;
  readonly description: string;
  readonly address: string;
  readonly source: string;
};

interface ToncenterResponse {
  ok?: boolean;
  result?: ToncenterAddressInfo;
  error?: string;
}

interface ToncenterAddressInfo {
  state?: string;
  balance?: string;
  code?: string | null;
  data?: string | null;
  code_hash?: string | null;
  data_hash?: string | null;
}

interface VerificationResult {
  definition: ContractDefinition;
  local: CellSummary;
  onchain: CellSummary | null;
  toncenter: {
    state?: string;
    balance?: string;
    codeHash?: string | null;
    dataHash?: string | null;
  };
  matches: boolean;
  notes: string[];
}

interface CellSummary {
  bocLength: number;
  hashHex: string;
}

const CONTRACTS_BY_NETWORK: Record<Network, readonly ContractDefinition[]> = {
  mainnet: [
    {
      name: "discoverable_master",
      description: "DCT FunC discoverable jetton master",
      address: TON_MAINNET_JETTON_MASTER,
      source: "jetton/discoverable/master.fc",
    },
  ],
  testnet: [],
};

function parseArgs(argv: readonly string[]): CliOptions {
  let network: Network = "mainnet";
  const args = [...argv];

  while (args.length > 0) {
    const token = args.shift();
    if (!token) continue;

    if (token === "--help" || token === "-h") {
      console.log(HELP_MESSAGE);
      process.exit(0);
    }

    if (token.startsWith("--network=")) {
      const value = token.split("=", 2)[1];
      network = normaliseNetwork(value);
      continue;
    }

    if (token === "--network" || token === "-n") {
      const value = args.shift();
      network = normaliseNetwork(value);
      continue;
    }

    if (token === "mainnet" || token === "testnet") {
      network = normaliseNetwork(token);
      continue;
    }

    throw new Error(`Unrecognized argument: ${token}`);
  }

  return { network };
}

function normaliseNetwork(value: string | undefined): Network {
  if (!value) {
    throw new Error("Missing network value; expected mainnet or testnet.");
  }
  const normalised = value.trim().toLowerCase();
  if (normalised === "mainnet" || normalised === "testnet") {
    return normalised;
  }
  throw new Error(`Unsupported network: ${value}`);
}

function loadSource(relativePath: string): string {
  const resolved = resolve(contractsRoot, relativePath);
  return readFileSync(resolved, "utf8");
}

function summariseCell(cell: Cell): CellSummary {
  const boc = cell.toBoc();
  return {
    bocLength: boc.length,
    hashHex: Buffer.from(cell.hash()).toString("hex"),
  };
}

async function compileContract(
  definition: ContractDefinition,
): Promise<CellSummary> {
  const compileResult = await compileFunc({
    targets: [definition.source],
    sources: loadSource,
  });

  if (compileResult.status === "error") {
    throw new Error(
      `FunC compilation failed for ${definition.source}: ${compileResult.message}`,
    );
  }

  const cells = Cell.fromBoc(Buffer.from(compileResult.codeBoc, "base64"));
  if (cells.length === 0) {
    throw new Error(
      `Compilation produced an empty BOC for ${definition.source}`,
    );
  }

  return summariseCell(cells[0]!);
}

async function fetchOnchainCode(
  address: string,
): Promise<ToncenterAddressInfo> {
  const params = new URLSearchParams({ address, include_code: "true" });
  const url = `${TONCENTER_ENDPOINT}?${params.toString()}`;
  const args = [
    "-sS",
    "-H",
    "Accept: application/json",
    "-H",
    "User-Agent: dynamic-capital-func-verifier/1.0",
    "-w",
    "\n%{http_code}",
    url,
  ];

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("curl", args));
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    const suffix = stderr ? `: ${stderr}` : "";
    throw new Error(`curl request to Toncenter failed${suffix}`);
  }

  const trimmed = stdout.trimEnd();
  const lines = trimmed.split("\n");
  const statusLine = lines.pop() ?? "";
  const statusCode = Number.parseInt(statusLine, 10);
  if (!Number.isFinite(statusCode)) {
    throw new Error(`Unexpected response from curl (status: ${statusLine})`);
  }

  const body = lines.join("\n");

  if (statusCode < 200 || statusCode >= 300) {
    let message = body.trim() || `HTTP ${statusCode}`;
    try {
      const payload = JSON.parse(body) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch (_parseError) {
      // keep original message
    }
    throw new Error(`Toncenter request failed: ${message}`);
  }

  let payload: ToncenterResponse;
  try {
    payload = JSON.parse(body) as ToncenterResponse;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Toncenter returned invalid JSON: ${reason}`);
  }

  if (!payload.ok || !payload.result) {
    const reason = payload.error ?? "unexpected Toncenter response";
    throw new Error(`Toncenter reported an error: ${reason}`);
  }

  return payload.result;
}

function decodeOnchainCode(info: ToncenterAddressInfo): CellSummary | null {
  const code = info.code ?? null;
  if (!code) {
    return null;
  }

  const buffer = Buffer.from(code, "base64");
  const cells = Cell.fromBoc(buffer);
  if (cells.length === 0) {
    return null;
  }
  return summariseCell(cells[0]!);
}

async function verifyContract(
  definition: ContractDefinition,
): Promise<VerificationResult> {
  const localSummary = await compileContract(definition);
  const toncenterInfo = await fetchOnchainCode(definition.address);

  const onchainSummary = decodeOnchainCode(toncenterInfo);
  const matches = onchainSummary !== null &&
    onchainSummary.hashHex === localSummary.hashHex;

  const notes: string[] = [];
  if (!onchainSummary) {
    notes.push("Toncenter did not return contract code");
  }

  if (
    toncenterInfo.code_hash && toncenterInfo.code_hash !== localSummary.hashHex
  ) {
    notes.push(
      `Toncenter code_hash ${toncenterInfo.code_hash} differs from local hash ${localSummary.hashHex}`,
    );
  }

  return {
    definition,
    local: localSummary,
    onchain: onchainSummary,
    toncenter: {
      state: toncenterInfo.state,
      balance: toncenterInfo.balance,
      codeHash: toncenterInfo.code_hash ?? null,
      dataHash: toncenterInfo.data_hash ?? null,
    },
    matches,
    notes,
  };
}

interface VerificationReport {
  run_at: string;
  network: Network;
  toncenter_endpoint: string;
  contracts: Array<{
    name: string;
    description: string;
    address: string;
    local_hash_hex: string;
    local_boc_length: number;
    onchain_hash_hex: string | null;
    onchain_boc_length: number | null;
    toncenter_state?: string;
    toncenter_balance?: string;
    toncenter_reported_code_hash?: string | null;
    toncenter_reported_data_hash?: string | null;
    matches: boolean;
    notes: string[];
  }>;
}

function buildReport(
  network: Network,
  results: readonly VerificationResult[],
): VerificationReport {
  return {
    run_at: new Date().toISOString(),
    network,
    toncenter_endpoint: TONCENTER_ENDPOINT,
    contracts: results.map((result) => ({
      name: result.definition.name,
      description: result.definition.description,
      address: result.definition.address,
      local_hash_hex: result.local.hashHex,
      local_boc_length: result.local.bocLength,
      onchain_hash_hex: result.onchain?.hashHex ?? null,
      onchain_boc_length: result.onchain?.bocLength ?? null,
      toncenter_state: result.toncenter.state,
      toncenter_balance: result.toncenter.balance,
      toncenter_reported_code_hash: result.toncenter.codeHash ?? null,
      toncenter_reported_data_hash: result.toncenter.dataHash ?? null,
      matches: result.matches,
      notes: result.notes,
    })),
  };
}

function formatSummary(results: readonly VerificationResult[]): void {
  if (results.length === 0) {
    console.log("No contracts configured for verification.");
    return;
  }

  const table = results.map((result) => ({
    Contract: result.definition.name,
    Address: result.definition.address,
    "Local hash": result.local.hashHex,
    "On-chain hash": result.onchain?.hashHex ?? "<missing>",
    Match: result.matches ? "✅" : "❌",
  }));

  console.table(table);

  for (const result of results) {
    if (result.notes.length > 0) {
      console.warn(
        `Notes for ${result.definition.name}: ${result.notes.join("; ")}`,
      );
    }
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const definitions = CONTRACTS_BY_NETWORK[options.network];
    if (!definitions || definitions.length === 0) {
      throw new Error(
        `No contract definitions configured for network ${options.network}.`,
      );
    }

    const results: VerificationResult[] = [];
    for (const definition of definitions) {
      const result = await verifyContract(definition);
      results.push(result);
    }

    formatSummary(results);

    const report = buildReport(options.network, results);
    const reportPath = resolve(
      dataDir,
      `ton_func_${options.network}_verification_report.json`,
    );
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Detailed report written to ${reportPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FunC verification failed: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  }
}

await main();
