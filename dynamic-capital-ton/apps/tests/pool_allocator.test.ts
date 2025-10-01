import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Buffer } from "node:buffer";
import {
  Address,
  Cell,
  beginCell,
  toNano,
} from "npm:@ton/core";

const OP_JETTON_TRANSFER = 0x0f8a7ea5;
const OP_DEPOSIT = 0x504f4f4c;

interface DepositForwardPayload {
  depositId: bigint;
  investorKey: string;
  usdtAmount: bigint;
  dctAmount: bigint;
  expectedFx: bigint;
  tonTxHash: string;
}

interface JettonTransferBody {
  jettonAmount: bigint;
  destination: Address;
  responseDestination: Address;
  forwardTonAmount: bigint;
  forwardPayload: Cell;
  queryId?: bigint;
}

interface SwapInput {
  depositId: string;
  investorKey: string;
  usdtAmount: number;
  fxRate: number;
  tonTxHash: string;
}

interface SwapPayload extends SwapInput {
  dctAmount: number;
}

interface SwapEvent extends SwapPayload {
  dctAmount: number;
  timestamp: number;
}

interface RouterForward {
  value: number;
  payload: SwapPayload;
}

interface JettonTransferInput extends SwapInput {
  wallet: string;
  jettonAmount: number;
  forwardTonAmount: number;
}

const DEFAULT_FORWARD_DESTINATION = Address.parse(
  "0:1111111111111111111111111111111111111111111111111111111111111111",
);
const DEFAULT_FORWARD_RESPONSE = Address.parse(
  "0:2222222222222222222222222222222222222222222222222222222222222222",
);

function normalizeHex(hex: string, bytes = 32): string {
  let normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length > bytes * 2) {
    throw new Error("hex value exceeds expected length");
  }
  normalized = normalized.padStart(bytes * 2, "0");
  return `0x${normalized.toLowerCase()}`;
}

function hexToBytes(hex: string, bytes = 32): Uint8Array {
  const normalized = normalizeHex(hex, bytes).slice(2);
  const result = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    const start = i * 2;
    result[i] = parseInt(normalized.slice(start, start + 2), 16);
  }
  return result;
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function createDepositForwardPayload(
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

function createJettonTransferBody({
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

function decodeAllocatorForwardPayload(cell: Cell) {
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

class MockAllocator {
  #paused = false;
  #pendingPauseAt: number | null = null;
  #pendingPauseState: boolean | null = null;
  #dctVault = 0;
  #routerForwards: RouterForward[] = [];
  #timelockSeconds: number;
  #now = 0;
  #jettonWallet: string;

  constructor({
    timelockSeconds,
    jettonWallet,
  }: {
    timelockSeconds: number;
    jettonWallet: string;
  }) {
    this.#timelockSeconds = timelockSeconds;
    this.#jettonWallet = jettonWallet;
  }

  setNow(ts: number) {
    this.#now = ts;
  }

  schedulePause(paused: boolean) {
    this.#pendingPauseAt = this.#now + this.#timelockSeconds;
    this.#pendingPauseState = paused;
  }

  executePause() {
    if (this.#pendingPauseAt === null || this.#pendingPauseState === null) {
      throw new Error("no pause scheduled");
    }
    if (this.#now < this.#pendingPauseAt) {
      throw new Error("timelock active");
    }
    this.#paused = this.#pendingPauseState;
    this.#pendingPauseAt = null;
    this.#pendingPauseState = null;
  }

  get isPaused(): boolean {
    return this.#paused;
  }

  swap(input: SwapInput): SwapEvent {
    if (this.#paused) {
      throw new Error("allocator paused");
    }
    const dctAmount = Number((input.usdtAmount / input.fxRate).toFixed(9));
    this.#dctVault += dctAmount;
    const payload: SwapPayload = {
      ...input,
      dctAmount,
    };
    return {
      ...payload,
      timestamp: this.#now,
    };
  }

  get routerForwards(): RouterForward[] {
    return this.#routerForwards.slice();
  }

  processJettonTransfer({
    wallet,
    jettonAmount,
    forwardTonAmount,
    ...input
  }: JettonTransferInput): SwapEvent {
    if (wallet !== this.#jettonWallet) {
      throw new Error("allocator: unauthorized jetton");
    }
    if (forwardTonAmount <= 0) {
      throw new Error("allocator: invalid forward TON");
    }
    if (input.usdtAmount !== jettonAmount) {
      throw new Error("allocator: amount mismatch");
    }
    const dctAmount = Number((jettonAmount / input.fxRate).toFixed(9));
    const payload: SwapPayload = {
      depositId: input.depositId,
      investorKey: input.investorKey,
      usdtAmount: jettonAmount,
      dctAmount,
      fxRate: input.fxRate,
      tonTxHash: input.tonTxHash,
    };
    this.#routerForwards.push({
      value: forwardTonAmount,
      payload,
    });
    this.#dctVault += dctAmount;
    return {
      ...payload,
      timestamp: this.#now,
    };
  }

  requestWithdrawal(usdtAmount: number) {
    if (usdtAmount <= 0) throw new Error("invalid amount");
    const dctNeeded = Number((usdtAmount / 1).toFixed(9));
    if (dctNeeded > this.#dctVault) {
      throw new Error("insufficient vault balance");
    }
    this.#dctVault -= dctNeeded;
    return { dctBurned: dctNeeded, usdtAmount };
  }

  get vaultBalance(): number {
    return Number(this.#dctVault.toFixed(9));
  }
}

Deno.test("pause timelock prevents immediate execution", () => {
  const allocator = new MockAllocator({
    timelockSeconds: 60,
    jettonWallet: "WALLET",
  });
  allocator.setNow(1000);
  allocator.schedulePause(true);
  assertThrows(() => allocator.executePause(), Error, "timelock");
  allocator.setNow(1100);
  allocator.executePause();
  assertEquals(allocator.vaultBalance, 0);
});

Deno.test("allocator can unpause after timelock", () => {
  const allocator = new MockAllocator({
    timelockSeconds: 30,
    jettonWallet: "WALLET",
  });
  allocator.setNow(500);
  allocator.schedulePause(true);
  allocator.setNow(540);
  allocator.executePause();
  assertEquals(allocator.isPaused, true);

  allocator.schedulePause(false);
  assertThrows(() => allocator.executePause(), Error, "timelock");
  allocator.setNow(580);
  allocator.executePause();
  assertEquals(allocator.isPaused, false);
});

Deno.test("swap inflates vault and returns event", () => {
  const allocator = new MockAllocator({
    timelockSeconds: 10,
    jettonWallet: "WALLET",
  });
  allocator.setNow(2000);
  const event = allocator.swap({
    depositId: "1",
    investorKey: "0xabc",
    usdtAmount: 1000,
    fxRate: 2,
    tonTxHash: "0xdead",
  });
  assertEquals(event.dctAmount, 500);
  assertEquals(allocator.vaultBalance, 500);
});

Deno.test("withdraw burns from vault", () => {
  const allocator = new MockAllocator({
    timelockSeconds: 10,
    jettonWallet: "WALLET",
  });
  allocator.setNow(0);
  allocator.swap({
    depositId: "1",
    investorKey: "0xabc",
    usdtAmount: 100,
    fxRate: 1,
    tonTxHash: "0xdead",
  });
  const receipt = allocator.requestWithdrawal(40);
  assertEquals(receipt.dctBurned, 40);
  assertEquals(allocator.vaultBalance, 60);
});

Deno.test("jetton transfers must originate from configured wallet", () => {
  const allocator = new MockAllocator({
    timelockSeconds: 5,
    jettonWallet: "GOOD",
  });
  allocator.setNow(0);
  const event = allocator.processJettonTransfer({
    wallet: "GOOD",
    jettonAmount: 200,
    forwardTonAmount: 0.75,
    depositId: "1",
    investorKey: "0xabc",
    usdtAmount: 200,
    fxRate: 2,
    tonTxHash: "0xbeef",
  });
  assertEquals(event.dctAmount, 100);
  assertEquals(allocator.routerForwards, [
    {
      value: 0.75,
      payload: {
        depositId: "1",
        investorKey: "0xabc",
        usdtAmount: 200,
        dctAmount: 100,
        fxRate: 2,
        tonTxHash: "0xbeef",
      },
    },
  ]);

  assertThrows(
    () =>
      allocator.processJettonTransfer({
        wallet: "BAD",
        jettonAmount: 50,
        forwardTonAmount: 0.5,
        depositId: "2",
        investorKey: "0xdef",
        usdtAmount: 50,
        fxRate: 1,
        tonTxHash: "0xfeed",
      }),
    Error,
    "unauthorized jetton",
  );
});

Deno.test("jetton transfer enforces forward ton amount", () => {
  const allocator = new MockAllocator({
    timelockSeconds: 5,
    jettonWallet: "GOOD",
  });
  allocator.setNow(0);
  allocator.processJettonTransfer({
    wallet: "GOOD",
    jettonAmount: 150,
    forwardTonAmount: 1.25,
    depositId: "42",
    investorKey: "0xface",
    usdtAmount: 150,
    fxRate: 3,
    tonTxHash: "0xcafe",
  });

  assertThrows(
    () =>
      allocator.processJettonTransfer({
        wallet: "GOOD",
        jettonAmount: 10,
        forwardTonAmount: 0,
        depositId: "99",
        investorKey: "0xdead",
        usdtAmount: 10,
        fxRate: 1,
        tonTxHash: "0xdead",
      }),
    Error,
    "invalid forward TON",
  );

  assertThrows(
    () =>
      allocator.processJettonTransfer({
        wallet: "GOOD",
        jettonAmount: 10,
        forwardTonAmount: 0.5,
        depositId: "11",
        investorKey: "0xbead",
        usdtAmount: 9,
        fxRate: 1,
        tonTxHash: "0xbead",
      }),
    Error,
    "amount mismatch",
  );

  assertEquals(allocator.routerForwards.at(-1), {
    value: 1.25,
    payload: {
      depositId: "42",
      investorKey: "0xface",
      usdtAmount: 150,
      dctAmount: 50,
      fxRate: 3,
      tonTxHash: "0xcafe",
    },
  });
});

Deno.test("tip-3 transfer payload carries allocator deposit fields", () => {
  const forwardPayload = createDepositForwardPayload({
    depositId: 42n,
    investorKey: "0xface",
    usdtAmount: 150n,
    dctAmount: 50n,
    expectedFx: 3n,
    tonTxHash: "0xcafe",
  });

  const forwardTonAmount = toNano("1.25");
  const body = createJettonTransferBody({
    jettonAmount: 150n,
    destination: DEFAULT_FORWARD_DESTINATION,
    responseDestination: DEFAULT_FORWARD_RESPONSE,
    forwardTonAmount,
    forwardPayload,
  });

  const slice = body.beginParse();
  assertEquals(slice.loadUint(32), OP_JETTON_TRANSFER);
  assertEquals(slice.loadUintBig(64), 0n);
  assertEquals(slice.loadCoins(), 150n);
  assertEquals(
    slice.loadAddress()?.toString(),
    DEFAULT_FORWARD_DESTINATION.toString(),
  );
  assertEquals(
    slice.loadAddress()?.toString(),
    DEFAULT_FORWARD_RESPONSE.toString(),
  );
  assertEquals(slice.loadMaybeRef(), null);
  assertEquals(slice.loadCoins(), forwardTonAmount);

  const forwardCell = slice.loadRef();
  const decoded = decodeAllocatorForwardPayload(forwardCell);
  assertEquals(decoded.depositId, 42n);
  assertEquals(decoded.investorKey, normalizeHex("0xface"));
  assertEquals(decoded.usdtAmount, 150n);
  assertEquals(decoded.dctAmount, 50n);
  assertEquals(decoded.expectedFx, 3n);
  assertEquals(decoded.tonTxHash, normalizeHex("0xcafe"));
  slice.endParse();
});

Deno.test("forward payload rejects non-deposit opcodes", () => {
  const invalidForward = beginCell()
    .storeUint(0xdeadbeef, 32)
    .storeUint(1n, 64)
    .storeBuffer(Buffer.from(hexToBytes("0x0")))
    .storeCoins(1n)
    .storeCoins(1n)
    .storeUint(1n, 64)
    .storeBuffer(Buffer.from(hexToBytes("0x1")))
    .endCell();

  assertThrows(
    () => decodeAllocatorForwardPayload(invalidForward),
    Error,
    "allocator: unsupported op",
  );
});
