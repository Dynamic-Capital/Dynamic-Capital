#!/usr/bin/env node
import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  createMemoryJettonMinterStore,
  createStartJettonMinterHandler,
  determineConfiguredNetwork,
  type JettonMinterRow,
  type JettonMinterStore,
  type StartJettonMinterRequest,
} from "../../dynamic-capital-ton/supabase/functions/start-jetton-minter/handler.ts";

const { values } = parseArgs({
  options: {
    network: { type: "string" },
    initiator: { type: "string" },
    note: { type: "string" },
    txHash: { type: "string" },
    targetSupply: { type: "string" },
    state: { type: "string" },
    payload: { type: "string" },
  },
});

const configuredNetwork = determineConfiguredNetwork(
  process.env.JETTON_MINTER_NETWORK,
);
const statePath = values.state
  ? resolve(process.cwd(), values.state)
  : resolve(process.cwd(), "supabase/.tmp/jetton-minter-state.json");

async function loadState(): Promise<JettonMinterRow[]> {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as JettonMinterRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function persistState(rows: JettonMinterRow[]): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

function createFileBackedStore(initial: JettonMinterRow[]): JettonMinterStore {
  const memory = createMemoryJettonMinterStore(initial);
  return {
    async fetchRun(network) {
      return memory.fetchRun(network);
    },
    async upsertRun(payload) {
      const result = await memory.upsertRun(payload);
      const snapshot = await Promise.all([
        memory.fetchRun("mainnet"),
        memory.fetchRun("testnet"),
      ]);
      const rows = snapshot.filter((row): row is JettonMinterRow =>
        Boolean(row)
      );
      await persistState(rows);
      return result;
    },
    async logStart(record) {
      await memory.logStart(record);
    },
  } satisfies JettonMinterStore;
}

function parsePayload(): StartJettonMinterRequest {
  if (values.payload) {
    const parsed = JSON.parse(values.payload) as StartJettonMinterRequest;
    return parsed;
  }

  const payload: StartJettonMinterRequest = {};
  if (values.network) payload.network = values.network;
  if (values.initiator) payload.initiator = values.initiator;
  if (values.note) payload.note = values.note;
  if (values.txHash) payload.txHash = values.txHash;
  if (values.targetSupply) {
    const maybeNumber = Number(values.targetSupply);
    if (!Number.isNaN(maybeNumber)) {
      payload.targetSupply = maybeNumber;
    }
  }
  return payload;
}

const payload = parsePayload();
const initialState = await loadState();
const store = createFileBackedStore(initialState);
const handler = createStartJettonMinterHandler({
  store,
  configuredNetwork,
});

const response = await handler(
  new Request("http://localhost/start-jetton-minter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }),
);

const text = await response.text();
let parsedBody: unknown;
try {
  parsedBody = JSON.parse(text);
} catch {
  parsedBody = text;
}

const output = {
  status: response.status,
  body: parsedBody,
};

console.log(JSON.stringify(output, null, 2));

if (response.status >= 400) {
  process.exitCode = 1;
}
