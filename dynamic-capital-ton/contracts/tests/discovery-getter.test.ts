import { compileFunc } from "@ton-community/func-js";
import { beginCell, Cell, Address, toNano } from "@ton/core";
import { SmartContract } from "ton-contract-executor";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONTRACT_ROOT = resolve(__dirname, "../jetton/discoverable");

function loadSource(path: string): string {
  const resolved = resolve(CONTRACT_ROOT, path);
  try {
    return readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`Failed to load FunC source "${path}" at ${resolved}: ${error}`);
  }
}

async function main() {
  const compileResult = await compileFunc({
    targets: ["master.fc"],
    sources: (path) => loadSource(path),
  });

  if (compileResult.status === "error") {
    throw new Error(`FunC compilation failed: ${compileResult.message}`);
  }

  const codeCell = Cell.fromBoc(Buffer.from(compileResult.codeBoc, "base64"))[0];

  const totalSupply = toNano("42");
  const adminAddress = Address.parse(
    "0:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  );
  const contentCell = beginCell().storeUint(0, 1).endCell();
  const walletCodeCell = beginCell().storeUint(0xaa, 8).endCell();
  const dataCell = beginCell()
    .storeCoins(totalSupply)
    .storeAddress(adminAddress)
    .storeRef(contentCell)
    .storeRef(walletCodeCell)
    .endCell();

  const contract = await SmartContract.fromCell(codeCell, dataCell);
  const result = await contract.invokeGetMethod("get_discovery_data", []);

  assert.equal(result.type, "success", `TVM exited with code ${result.exit_code}`);
  assert.equal(result.exit_code, 0);
  assert.equal(result.result.length, 2);

  const [version, walletCell] = result.result;
  assert.equal(version, 1n, "Discovery protocol version mismatch");
  assert.ok(walletCell instanceof Cell, "Wallet code was not returned as a cell");
  assert.ok((walletCell as Cell).equals(walletCodeCell), "Wallet code cell mismatch");
}

await main();
process.exit(0);
