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

class MockAllocator {
  #paused = false;
  #pendingPauseAt: number | null = null;
  #pendingPauseState: boolean | null = null;
  #dctVault = 0;
  #timelockSeconds: number;
  #now = 0;

  constructor({ timelockSeconds }: { timelockSeconds: number }) {
    this.#timelockSeconds = timelockSeconds;
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

Deno.test("pause timelock prevents immediate execution", async (t) => {
  const allocator = new MockAllocator({ timelockSeconds: 60 });
  allocator.setNow(1000);
  allocator.schedulePause(true);
  assertThrows(() => allocator.executePause(), /timelock/);
  allocator.setNow(1100);
  allocator.executePause();
  assertEquals(allocator.vaultBalance, 0);
});

Deno.test("swap inflates vault and returns event", () => {
  const allocator = new MockAllocator({ timelockSeconds: 10 });
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
  const allocator = new MockAllocator({ timelockSeconds: 10 });
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
