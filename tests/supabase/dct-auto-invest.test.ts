import test from "node:test";
import {
  deepEqual as assertDeepEqual,
  equal as assertEqual,
  ok as assertOk,
  rejects as assertRejects,
} from "node:assert/strict";
import { freshImport } from "../utils/freshImport.ts";
import {
  __resetSupabaseState,
  __testSupabaseState,
  createClient,
} from "../supabase-client-stub.ts";

const managerModuleUrl = new URL(
  "../../supabase/functions/dct-auto-invest/subscription-manager.ts",
  import.meta.url,
);

test("subscription manager rejects duplicate transactions", async () => {
  __resetSupabaseState();
  const managerModule = await freshImport(
    managerModuleUrl,
  ) as typeof import("../../supabase/functions/dct-auto-invest/subscription-manager.ts");
  const {
    SubscriptionManager,
    DuplicateSubscriptionError,
  } = managerModule;
  type Module = typeof managerModule;

  const supabase = createClient();
  const executeSwap: Module["SubscriptionManagerDependencies"]["executeSwap"] =
    async (tonAmount, tag) => ({
      dctAmount: tag === "auto-invest" ? tonAmount * 2 : tonAmount * 0.5,
      swapTxHash: `${tag}-swap`,
      routerSwapId: `${tag}-router`,
      priceSnapshotId: `${tag}-price`,
      oraclePrice: 2,
      usdNotional: tonAmount * 4,
    });
  const burnCalls: Array<{ amount: number; context: Record<string, unknown> }> =
    [];
  const triggerBurn: Module["SubscriptionManagerDependencies"]["triggerBurn"] =
    async (amount, context) => {
      burnCalls.push({ amount, context });
      return "burn-123";
    };
  const now = new Date("2024-01-01T00:00:00.000Z");
  const manager = new SubscriptionManager({
    supabase,
    executeSwap,
    triggerBurn,
    now: () => new Date(now),
  });

  const splits = {
    operationsPct: 60,
    autoInvestPct: 30,
    buybackBurnPct: 10,
  } satisfies Module["SplitConfig"];
  const tonAmount = 10;
  const autoInvestTon = 3;
  const burnTon = 1;
  const operationsTon = 6;
  const verification: Module["VerifiedTonPayment"] = {
    ok: true,
    amountTon: tonAmount,
  };

  const beneficiary: Module["SubscriptionBeneficiary"] = {
    walletAddress: "wallet-1",
    telegramId: 123,
    tonDomain: "alice.ton",
    metadata: { note: "first" },
  };

  const details: Module["SubscriptionPaymentDetails"] = {
    plan: "vip_bronze",
    tonTxHash: "tx-1",
    tonAmount,
    operationsTon,
    autoInvestTon,
    burnTon,
    splits,
    verification,
    operationsWallet: "ops-wallet",
    dctMaster: "dct-master",
    nextRenewalAt: "2024-02-01T00:00:00.000Z",
    paymentId: "pay-1",
  };

  const receipt = await manager.payFor(beneficiary, details);
  assertOk(receipt.subscriptionId);
  assertEqual(receipt.tonAmount, tonAmount);
  assertEqual(burnCalls.length, 1);
  assertDeepEqual(burnCalls[0].context, {
    tonTxHash: "tx-1",
    dctMaster: "dct-master",
  });
  assertEqual(__testSupabaseState.dctSubscriptions.size, 1);

  await assertRejects(
    () => manager.payFor(beneficiary, details),
    (error) => error instanceof DuplicateSubscriptionError,
  );
  assertEqual(__testSupabaseState.dctSubscriptions.size, 1);
});

test("subscription manager invokes burn hook with swap output", async () => {
  __resetSupabaseState();
  const managerModule = await freshImport(
    managerModuleUrl,
  ) as typeof import("../../supabase/functions/dct-auto-invest/subscription-manager.ts");
  const { SubscriptionManager } = managerModule;
  type Module = typeof managerModule;

  const supabase = createClient();
  const executeSwap: Module["SubscriptionManagerDependencies"]["executeSwap"] =
    async (tonAmount, tag) => ({
      dctAmount: tag === "buyback-burn" ? 5.4321 : 7.6543,
      swapTxHash: `${tag}-swap`,
      routerSwapId: `${tag}-router`,
      priceSnapshotId: null,
      oraclePrice: 1.5,
      usdNotional: tonAmount * 3,
    });
  const burnCalls: Array<{ amount: number; context: Record<string, unknown> }> =
    [];
  const triggerBurn: Module["SubscriptionManagerDependencies"]["triggerBurn"] =
    async (amount, context) => {
      burnCalls.push({ amount, context });
      return "burn-hash";
    };

  const manager = new SubscriptionManager({
    supabase,
    executeSwap,
    triggerBurn,
    now: () => new Date("2024-03-01T00:00:00.000Z"),
  });

  const beneficiary: Module["SubscriptionBeneficiary"] = {
    walletAddress: "wallet-2",
  };
  const details: Module["SubscriptionPaymentDetails"] = {
    plan: "vip_gold",
    tonTxHash: "tx-2",
    tonAmount: 12,
    operationsTon: 7,
    autoInvestTon: 3,
    burnTon: 2,
    splits: {
      operationsPct: 60,
      autoInvestPct: 25,
      buybackBurnPct: 15,
    },
    verification: { ok: true, amountTon: 12 },
    operationsWallet: "ops-wallet",
    dctMaster: "dct-master",
    nextRenewalAt: null,
    paymentId: null,
  };

  const receipt = await manager.payFor(beneficiary, details);
  assertEqual(burnCalls.length, 1);
  assertEqual(burnCalls[0].amount, 5.4321);
  assertDeepEqual(burnCalls[0].context, {
    tonTxHash: "tx-2",
    dctMaster: "dct-master",
  });
  assertEqual(receipt.burn.burnTxHash, "burn-hash");
  assertEqual(receipt.burn.dct, managerModule.roundTon(5.4321));
});
