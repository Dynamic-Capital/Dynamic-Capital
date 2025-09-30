import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

interface SwapInput {
  depositId: string;
  investorKey: string;
  usdtAmount: number;
  fxRate: number;
  tonTxHash: string;
}

interface SwapEvent extends SwapInput {
  dctAmount: number;
  timestamp: number;
}

interface RouterForward {
  value: number;
  payload: SwapInput;
}

interface JettonTransferInput extends SwapInput {
  wallet: string;
  jettonAmount: number;
  forwardTonAmount: number;
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
    return {
      ...input,
      dctAmount,
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
    this.#routerForwards.push({
      value: forwardTonAmount,
      payload: input,
    });
    this.#dctVault += jettonAmount;
    return {
      ...input,
      usdtAmount: jettonAmount,
      dctAmount: jettonAmount,
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
  const allocator = new MockAllocator({ timelockSeconds: 60, jettonWallet: "WALLET" });
  allocator.setNow(1000);
  allocator.schedulePause(true);
  assertThrows(() => allocator.executePause(), /timelock/);
  allocator.setNow(1100);
  allocator.executePause();
  assertEquals(allocator.vaultBalance, 0);
});

Deno.test("allocator can unpause after timelock", () => {
  const allocator = new MockAllocator({ timelockSeconds: 30, jettonWallet: "WALLET" });
  allocator.setNow(500);
  allocator.schedulePause(true);
  allocator.setNow(540);
  allocator.executePause();
  assertEquals(allocator.isPaused, true);

  allocator.schedulePause(false);
  assertThrows(() => allocator.executePause(), /timelock/);
  allocator.setNow(580);
  allocator.executePause();
  assertEquals(allocator.isPaused, false);
});

Deno.test("swap inflates vault and returns event", () => {
  const allocator = new MockAllocator({ timelockSeconds: 10, jettonWallet: "WALLET" });
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
  const allocator = new MockAllocator({ timelockSeconds: 10, jettonWallet: "WALLET" });
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
  const allocator = new MockAllocator({ timelockSeconds: 5, jettonWallet: "GOOD" });
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
  assertEquals(event.dctAmount, 200);
  assertEquals(allocator.routerForwards, [
    {
      value: 0.75,
      payload: {
        depositId: "1",
        investorKey: "0xabc",
        usdtAmount: 200,
        fxRate: 2,
        tonTxHash: "0xbeef",
      },
    },
  ]);

  assertThrows(() =>
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
    /unauthorized jetton/,
  );
});

Deno.test("jetton transfer enforces forward ton amount", () => {
  const allocator = new MockAllocator({ timelockSeconds: 5, jettonWallet: "GOOD" });
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

  assertThrows(() =>
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
    /invalid forward TON/,
  );

  assertThrows(() =>
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
    /amount mismatch/,
  );

  assertEquals(allocator.routerForwards.at(-1), {
    value: 1.25,
    payload: {
      depositId: "42",
      investorKey: "0xface",
      usdtAmount: 150,
      fxRate: 3,
      tonTxHash: "0xcafe",
    },
  });
});
