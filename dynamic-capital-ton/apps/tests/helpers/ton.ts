import { Buffer } from "node:buffer";

export class Address {
  #raw: string;

  private constructor(raw: string) {
    this.#raw = raw;
  }

  static parse(value: string): Address {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("address: value must be a non-empty string");
    }

    const normalized = value.trim();
    if (!/^[0-9a-fA-F:-]+$/.test(normalized)) {
      throw new Error("address: invalid characters");
    }

    return new Address(normalized);
  }

  toString(): string {
    return this.#raw;
  }
}

type StoredItem =
  | { type: "uint"; bits: number; value: bigint }
  | { type: "coins"; value: bigint }
  | { type: "buffer"; value: Uint8Array }
  | { type: "address"; value: Address }
  | { type: "maybeRef"; value: Cell | null }
  | { type: "ref"; value: Cell };

class CellBuilder {
  #items: StoredItem[] = [];

  #assertBits(bits: number) {
    if (!Number.isInteger(bits) || bits <= 0) {
      throw new Error("cell: bit width must be a positive integer");
    }
  }

  storeUint(value: number | bigint, bits: number): this {
    this.#assertBits(bits);
    const numeric = typeof value === "bigint" ? value : BigInt(value);
    if (numeric < 0n) {
      throw new Error("cell: unsigned integer cannot be negative");
    }
    const limit = 1n << BigInt(bits);
    if (numeric >= limit) {
      throw new Error("cell: value exceeds bit width");
    }
    this.#items.push({ type: "uint", bits, value: numeric });
    return this;
  }

  storeCoins(value: number | bigint): this {
    const numeric = typeof value === "bigint" ? value : BigInt(value);
    if (numeric < 0n) {
      throw new Error("cell: coins cannot be negative");
    }
    this.#items.push({ type: "coins", value: numeric });
    return this;
  }

  storeBuffer(buffer: Uint8Array): this {
    this.#items.push({ type: "buffer", value: new Uint8Array(buffer) });
    return this;
  }

  storeAddress(address: Address): this {
    this.#items.push({ type: "address", value: address });
    return this;
  }

  storeMaybeRef(cell: Cell | null): this {
    this.#items.push({ type: "maybeRef", value: cell });
    return this;
  }

  storeRef(cell: Cell): this {
    this.#items.push({ type: "ref", value: cell });
    return this;
  }

  endCell(): Cell {
    return new Cell(this.#items.slice());
  }
}

class Slice {
  #items: StoredItem[];
  #offset = 0;

  constructor(items: StoredItem[]) {
    this.#items = items;
  }

  #next<T extends StoredItem["type"]>(type: T): Extract<StoredItem, { type: T }> {
    const item = this.#items.at(this.#offset);
    if (!item) {
      throw new Error("cell: no more data to load");
    }
    if (item.type !== type) {
      throw new Error(`cell: expected ${type} but found ${item.type}`);
    }
    this.#offset += 1;
    return item as Extract<StoredItem, { type: T }>;
  }

  loadUint(bits: number): number {
    const item = this.#next("uint");
    if (item.bits !== bits) {
      throw new Error("cell: unexpected uint bit width");
    }
    return Number(item.value);
  }

  loadUintBig(bits: number): bigint {
    const item = this.#next("uint");
    if (item.bits !== bits) {
      throw new Error("cell: unexpected uint bit width");
    }
    return item.value;
  }

  loadCoins(): bigint {
    return this.#next("coins").value;
  }

  loadBuffer(expectedLength?: number): Uint8Array {
    const { value } = this.#next("buffer");
    if (typeof expectedLength === "number" && value.length !== expectedLength) {
      throw new Error("cell: buffer length mismatch");
    }
    return value;
  }

  loadAddress(): Address | null {
    return this.#next("address").value;
  }

  loadMaybeRef(): Cell | null {
    return this.#next("maybeRef").value;
  }

  loadRef(): Cell {
    return this.#next("ref").value;
  }

  endParse(): void {
    if (this.#offset !== this.#items.length) {
      throw new Error("cell: unread data remaining");
    }
  }
}

export class Cell {
  #items: StoredItem[];

  constructor(items: StoredItem[]) {
    this.#items = items;
  }

  beginParse(): Slice {
    return new Slice(this.#items.slice());
  }
}

export function beginCell(): CellBuilder {
  return new CellBuilder();
}

export function toNano(value: string | number | bigint): bigint {
  if (typeof value === "bigint") {
    return value * 1_000_000_000n;
  }

  const stringValue = typeof value === "number" ? value.toString() : value;
  if (typeof stringValue !== "string" || !/^[0-9]+(\.[0-9]+)?$/.test(stringValue)) {
    throw new Error("toNano: value must be a numeric string");
  }

  const [whole, fraction = ""] = stringValue.split(".");
  const fractionPadded = `${fraction}000000000`.slice(0, 9);
  return BigInt(whole) * 1_000_000_000n + BigInt(fractionPadded);
}

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
