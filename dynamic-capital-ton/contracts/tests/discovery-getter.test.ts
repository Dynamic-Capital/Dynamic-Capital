import { compileFunc } from "@ton-community/func-js";
import { beginCell, Cell, Address, toNano } from "@ton/core";
import { SmartContract, internal, type SendMsgAction } from "ton-contract-executor";
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

const MASTER_ADDRESS = Address.parse(
  "0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
);
const DISCOVERY_PROTOCOL_VERSION = 1n;
const OP_PROVIDE_WALLET_ADDRESS = 0x2c76b973;
const OP_TAKE_WALLET_ADDRESS = 0xd1735400;

function buildWalletData(ownerAddress: Address, masterAddress: Address): Cell {
  return beginCell()
    .storeUint(0, 4)
    .storeCoins(0n)
    .storeAddress(ownerAddress)
    .storeAddress(masterAddress)
    .endCell();
}

function buildWalletStateInit(
  ownerAddress: Address,
  masterAddress: Address,
  walletCode: Cell,
): Cell {
  return beginCell()
    .storeUint(0, 2)
    .storeMaybeRef(walletCode)
    .storeMaybeRef(buildWalletData(ownerAddress, masterAddress))
    .storeUint(0, 1)
    .endCell();
}

function calculateWalletAddress(
  ownerAddress: Address,
  masterAddress: Address,
  walletCode: Cell,
): Address {
  const stateInit = buildWalletStateInit(ownerAddress, masterAddress, walletCode);
  return new Address(masterAddress.workChain, stateInit.hash());
}

function expectSingleResponse(actions: SendMsgAction[]): SendMsgAction {
  assert.equal(actions.length, 1, "Expected a single response action");
  return actions[0];
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
  contract.setC7Config({ myself: MASTER_ADDRESS, balance: toNano("10") });

  const discoveryResult = await contract.invokeGetMethod("get_discovery_data", []);

  assert.equal(
    discoveryResult.type,
    "success",
    `TVM exited with code ${discoveryResult.exit_code}`,
  );
  assert.equal(discoveryResult.exit_code, 0);
  assert.equal(discoveryResult.result.length, 2);

  const [version, walletCell] = discoveryResult.result;
  assert.equal(version, DISCOVERY_PROTOCOL_VERSION, "Discovery protocol version mismatch");
  assert.ok(walletCell instanceof Cell, "Wallet code was not returned as a cell");
  assert.ok((walletCell as Cell).equals(walletCodeCell), "Wallet code cell mismatch");

  const senderAddress = Address.parse(
    "0:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  );
  const ownerAddress = Address.parse(
    "0:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  );
  const queryId = 42n;

  const provideResult = await contract.sendInternalMessage(
    internal({
      src: senderAddress,
      dest: MASTER_ADDRESS,
      value: toNano("0.05"),
      forwardFee: toNano("0.01"),
      bounce: false,
      body: beginCell()
        .storeUint(OP_PROVIDE_WALLET_ADDRESS, 32)
        .storeUint(queryId, 64)
        .storeAddress(ownerAddress)
        .storeUint(1, 1)
        .endCell(),
    }),
  );

  assert.equal(provideResult.type, "success", `TVM exited with code ${provideResult.exit_code}`);
  assert.equal(provideResult.exit_code, 0);

  const sendActions = provideResult.actionList.filter(
    (action): action is SendMsgAction => action.type === "send_msg",
  );
  const response = expectSingleResponse(sendActions);

  assert.equal(response.mode, 64, "Response must keep the original mode");
  assert.equal(response.message.info.type, "internal");
  assert.ok(
    response.message.info.dest?.equals(senderAddress),
    "Response destination mismatch",
  );

  const bodySlice = response.message.body.beginParse();
  assert.equal(bodySlice.loadUint(32), OP_TAKE_WALLET_ADDRESS);
  const responseQueryId = bodySlice.loadUint(64);
  assert.equal(Number(responseQueryId), Number(queryId));

  const walletAddress = bodySlice.loadMaybeAddress();
  assert.ok(walletAddress, "Wallet address was not returned");
  const expectedWalletAddress = calculateWalletAddress(
    ownerAddress,
    MASTER_ADDRESS,
    walletCodeCell,
  );
  assert.ok(
    walletAddress!.equals(expectedWalletAddress),
    "Wallet address mismatch",
  );

  const includedAddressRef = bodySlice.loadMaybeRef();
  assert.ok(includedAddressRef, "Owner address reference missing");
  const includedAddress = includedAddressRef.beginParse().loadAddress();
  assert.ok(includedAddress.equals(ownerAddress), "Included owner address mismatch");
}

await main();
process.exit(0);
