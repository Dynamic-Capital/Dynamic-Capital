import { assertEquals } from "std/assert/mod.ts";
import { createDepositHandler } from "../private-pool-deposit/index.ts";
import { createSettleHandler, type NotifyArgs } from "../private-pool-settle-cycle/index.ts";
import { MockPrivatePoolStore } from "./private_pool_mock.ts";

denoTest("private-pool-settle-cycle splits profit and seeds next cycle", async () => {
  const adminProfile = "profile-admin";
  const investorAProfile = "profile-a";
  const investorBProfile = "profile-b";
  const store = new MockPrivatePoolStore({
    profiles: [
      { id: adminProfile, role: "admin", telegram_id: "300", display_name: "Admin" },
      { id: investorAProfile, role: "user", telegram_id: "301", display_name: "Investor A" },
      { id: investorBProfile, role: "user", telegram_id: "302", display_name: "Investor B" },
    ],
  });
  const depositA = createDepositHandler({
    createStore: () => store,
    resolveProfile: () => Promise.resolve({ profileId: investorAProfile, telegramId: "301" }),
    now: () => new Date("2025-03-01T00:00:00Z"),
  });
  const depositB = createDepositHandler({
    createStore: () => store,
    resolveProfile: () => Promise.resolve({ profileId: investorBProfile, telegramId: "302" }),
    now: () => new Date("2025-03-01T00:05:00Z"),
  });
  await depositA(new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ amount: 200 }),
    headers: { "content-type": "application/json" },
  }));
  await depositB(new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ amount: 100 }),
    headers: { "content-type": "application/json" },
  }));
  const notifications: NotifyArgs[] = [];
  const settle = createSettleHandler({
    createStore: () => store,
    resolveProfile: () => Promise.resolve({ profileId: adminProfile, telegramId: "300" }),
    now: () => new Date("2025-03-31T18:00:00Z"),
    notifyInvestors: (args) => {
      notifications.push(args);
      return Promise.resolve();
    },
  });
  const resp = await settle(new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ profit: 300, notes: "March cycle" }),
    headers: { "content-type": "application/json" },
  }));
  assertEquals(resp.status, 200);
  const json = await resp.json();
  assertEquals(json.ok, true);
  assertEquals(json.totals.profit_total, 300);
  assertEquals(json.totals.payout_total, 192);
  assertEquals(json.totals.reinvest_total, 48);
  assertEquals(json.totals.performance_fee_total, 60);
  assertEquals(json.payoutSummary.length, 2);
  const activeCycle = await store.getActiveCycle();
  if (!activeCycle) throw new Error("new active cycle missing");
  const previousCycleId = json.cycleId as string;
  const previousCycle = store.fundCycles.get(previousCycleId);
  if (!previousCycle) throw new Error("previous cycle not stored");
  assertEquals(previousCycle.status, "settled");
  const nextCycleId = json.nextCycle.id as string;
  assertEquals(activeCycle.id, nextCycleId);
  const newDeposits = store.deposits.filter((d) => d.cycle_id === nextCycleId);
  assertEquals(newDeposits.length, 4);
  const newShares = await store.listShares(nextCycleId);
  const shareA = newShares.find((s) => store.investors.get(s.investor_id)?.profile_id === investorAProfile);
  const shareB = newShares.find((s) => store.investors.get(s.investor_id)?.profile_id === investorBProfile);
  if (!shareA || !shareB) throw new Error("new share entries missing");
  assertEquals(Math.round(shareA.share_percentage * 100) / 100, 66.67);
  assertEquals(Math.round(shareB.share_percentage * 100) / 100, 33.33);
  assertEquals(notifications.length, 1);
  const note = notifications[0];
  assertEquals(note.totals.profit_total, 300);
  assertEquals(note.summary.length, 2);
  assertEquals(note.notes, "March cycle");
});

function denoTest(name: string, fn: () => Promise<void> | void) {
  Deno.test(name, fn);
}
