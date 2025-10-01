import { Buffer } from "node:buffer";
import { Address, Cell, beginCell } from "npm:@ton/core";

export const OP_JETTON_TRANSFER = 0x0f8a7ea5;
export const OP_DEPOSIT = 0x504f4f4c;

export interface DepositForwardPayload {
  depositId: bigint;
  investorKey: string;
  usdtAmount: bigint;
  dctAmount: bigint;
  expectedFx: bigint;
  tonTxHash: string;
}

export interface JettonTransferBody {
  jettonAmount: bigint;
  destination: Address;
  responseDestination: Address;
  forwardTonAmount: bigint;
  forwardPayload: Cell;
  queryId?: bigint;
}

export const DEFAULT_FORWARD_DESTINATION = Address.parse(
  "0:1111111111111111111111111111111111111111111111111111111111111111",
);

export const DEFAULT_FORWARD_RESPONSE = Address.parse(
  "0:2222222222222222222222222222222222222222222222222222222222222222",
);

export function normalizeHex(hex: string, bytes = 32): string {
  let normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length > bytes * 2) {
    throw new Error("hex value exceeds expected length");
  }
  if (normalized.length % 2 !== 0) {
    normalized = `0${normalized}`;
  }
  normalized = normalized.padStart(bytes * 2, "0");
  return `0x${normalized.toLowerCase()}`;
}

export function hexToBytes(hex: string, bytes = 32): Uint8Array {
  const normalized = normalizeHex(hex, bytes).slice(2);
  const result = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    const start = i * 2;
    result[i] = parseInt(normalized.slice(start, start + 2), 16);
  }
  return result;
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function createDepositForwardPayload(
  payload: DepositForwardPayload,
): Cell {
  const builder = beginCell();
  builder.storeUint(OP_DEPOSIT, 32);
  builder.storeUint(payload.depositId, 64);
  builder.storeBuffer(Buffer.from(hexToBytes(payload.investorKey)));
  builder.storeCoins(payload.usdtAmount);
  builder.storeCoins(payload.dctAmount);
  builder.storeUint(payload.expectedFx, 64);
  builder.storeBuffer(Buffer.from(hexToBytes(payload.tonTxHash)));
  return builder.endCell();
}

export function createJettonTransferBody({
  jettonAmount,
  destination,
  responseDestination,
  forwardTonAmount,
  forwardPayload,
  queryId = 0n,
}: JettonTransferBody): Cell {
  const builder = beginCell();
  builder.storeUint(OP_JETTON_TRANSFER, 32);
  builder.storeUint(queryId, 64);
  builder.storeCoins(jettonAmount);
  builder.storeAddress(destination);
  builder.storeAddress(responseDestination);
  builder.storeMaybeRef(null);
  builder.storeCoins(forwardTonAmount);
  builder.storeRef(forwardPayload);
  return builder.endCell();
}

export function decodeAllocatorForwardPayload(cell: Cell) {
  const slice = cell.beginParse();
  const op = slice.loadUint(32);
  if (op !== OP_DEPOSIT) {
    throw new Error("allocator: unsupported op");
  }
  const depositId = slice.loadUintBig(64);
  const investorKey = bytesToHex(slice.loadBuffer(32));
  const usdtAmount = slice.loadCoins();
  const dctAmount = slice.loadCoins();
  if (dctAmount <= 0n) {
    throw new Error("allocator: invalid dct amount");
  }
  const expectedFx = slice.loadUintBig(64);
  const tonTxHash = bytesToHex(slice.loadBuffer(32));
  slice.endParse();
  return {
    depositId,
    investorKey,
    usdtAmount,
    dctAmount,
    expectedFx,
    tonTxHash,
  };
}
