import { compileFunc } from "@ton-community/func-js";
import { beginCell, Cell, Address, toNano, Slice } from "@ton/core";
import {
  SmartContract,
  internal,
  stackSlice,
  type ExecutionResult,
  type SendMsgAction,
  type SuccessfulExecutionResult,
} from "ton-contract-executor";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { TON_MAINNET_JETTON_MASTER } from "../../../shared/ton/mainnet-addresses.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONTRACT_ROOT = resolve(__dirname, "..");
const TARGET_SOURCE = "jetton/discoverable/master.fc";

function loadSource(path: string): string {
  const resolved = resolve(CONTRACT_ROOT, path);
  try {
    return readFileSync(resolved, "utf8");
  } catch (error) {
    throw new Error(`Failed to load FunC source "${path}" at ${resolved}: ${error}`);
  }
}

const MASTER_FRIENDLY_ADDRESS = TON_MAINNET_JETTON_MASTER;
const MASTER_ADDRESS = Address.parseFriendly(MASTER_FRIENDLY_ADDRESS).address;
const DISCOVERY_PROTOCOL_VERSION = 1n;
const OP_PROVIDE_WALLET_ADDRESS = 0x2c76b973;
const OP_TAKE_WALLET_ADDRESS = 0xd1735400;

function expectSuccessfulExecution(
  result: ExecutionResult,
  context: string,
): asserts result is SuccessfulExecutionResult {
  assert.equal(result.type, "success", `${context}: TVM exited with code ${result.exit_code}`);
  assert.equal(result.exit_code, 0, `${context}: expected zero exit code`);
}

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

export async function runDiscoveryGetterRegression() {
  assert.equal(
    MASTER_ADDRESS.toString({ urlSafe: true }),
    MASTER_FRIENDLY_ADDRESS,
    "DCT master contract address mismatch",
  );

  const compileResult = await compileFunc({
    targets: [TARGET_SOURCE],
    sources: loadSource,
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
  expectSuccessfulExecution(discoveryResult, "get_discovery_data");
  assert.equal(discoveryResult.result.length, 2);

  const [version, walletCell] = discoveryResult.result;
  assert.equal(version, DISCOVERY_PROTOCOL_VERSION, "Discovery protocol version mismatch");
  assert.ok(walletCell instanceof Cell, "Wallet code was not returned as a cell");
  assert.ok((walletCell as Cell).equals(walletCodeCell), "Wallet code cell mismatch");

  const jettonDataResult = await contract.invokeGetMethod("get_jetton_data", []);
  expectSuccessfulExecution(jettonDataResult, "get_jetton_data");
  assert.equal(jettonDataResult.result.length, 5, "Unexpected jetton data stack length");

  const [supplyResult, mintableResult, adminEntry, contentEntry, walletCodeEntry] =
    jettonDataResult.result;
  assert.equal(supplyResult, totalSupply, "Total supply mismatch");
  assert.equal(mintableResult, -1n, "Mintable flag mismatch");
  assert.ok(
    adminEntry instanceof Cell || adminEntry instanceof Slice,
    "Admin address entry must be a cell slice",
  );
  const adminSlice =
    adminEntry instanceof Cell ? adminEntry.beginParse() : (adminEntry as Slice).clone();
  const resolvedAdminAddress = adminSlice.loadAddress();
  assert.ok(resolvedAdminAddress?.equals(adminAddress), "Admin address mismatch");
  assert.ok(contentEntry instanceof Cell, "Content entry must be a cell");
  assert.ok((contentEntry as Cell).equals(contentCell), "Content cell mismatch");
  assert.ok(walletCodeEntry instanceof Cell, "Wallet code entry must be a cell");
  assert.ok((walletCodeEntry as Cell).equals(walletCodeCell), "Wallet code mismatch");

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

  expectSuccessfulExecution(provideResult, "provide_wallet_address");

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

  const walletAddressResult = await contract.invokeGetMethod(
    "get_wallet_address",
    [stackSlice(beginCell().storeAddress(ownerAddress).endCell())],
  );
  expectSuccessfulExecution(walletAddressResult, "get_wallet_address");
  assert.equal(walletAddressResult.result.length, 1, "Unexpected wallet address stack length");
  const derivedWalletSlice = walletAddressResult.result[0];
  assert.ok(
    derivedWalletSlice instanceof Cell || derivedWalletSlice instanceof Slice,
    "Wallet address result must be a cell slice",
  );
  const resolvedWalletSlice =
    derivedWalletSlice instanceof Cell
      ? derivedWalletSlice.beginParse()
      : (derivedWalletSlice as Slice).clone();
  const derivedWalletAddress = resolvedWalletSlice.loadAddress();
  assert.ok(
    derivedWalletAddress?.equals(expectedWalletAddress),
    "Derived wallet address mismatch",
  );
}

if (import.meta.url === `file://${__filename}`) {
  runDiscoveryGetterRegression()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
