import { assertEquals } from "std/assert/mod.ts";
import { createDepositHandler } from "../private-pool-deposit/index.ts";
import { createWithdrawHandler } from "../private-pool-withdraw/index.ts";
import { MockPrivatePoolStore } from "./private_pool_mock.ts";

denoTest(
  "private-pool-withdraw enforces notice and admin approval recalculates shares",
  async () => {
    const investorProfile = "profile-investor";
    const investorTwoProfile = "profile-investor-2";
    const adminProfile = "profile-admin";
    const store = new MockPrivatePoolStore({
      profiles: [
        {
          id: investorProfile,
          role: "user",
          telegram_id: "101",
          display_name: "Investor A",
        },
        {
          id: investorTwoProfile,
          role: "user",
          telegram_id: "102",
          display_name: "Investor B",
        },
        {
          id: adminProfile,
          role: "admin",
          telegram_id: "201",
          display_name: "Admin",
        },
      ],
    });
    const depositHandlerA = createDepositHandler({
      createStore: () => store,
      resolveProfile: () =>
        Promise.resolve({ profileId: investorProfile, telegramId: "101" }),
      now: () => new Date("2025-02-01T00:00:00Z"),
    });
    const depositHandlerB = createDepositHandler({
      createStore: () => store,
      resolveProfile: () =>
        Promise.resolve({ profileId: investorTwoProfile, telegramId: "102" }),
      now: () => new Date("2025-02-01T00:05:00Z"),
    });
    await depositHandlerA(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ amount: 200 }),
        headers: { "content-type": "application/json" },
      }),
    );
    await depositHandlerB(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
        headers: { "content-type": "application/json" },
      }),
    );
    const withdrawHandlerInvestor = createWithdrawHandler({
      createStore: () => store,
      resolveProfile: () =>
        Promise.resolve({ profileId: investorProfile, telegramId: "101" }),
      now: () => new Date("2025-02-10T00:00:00Z"),
    });
    const requestResp = await withdrawHandlerInvestor(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ amount: 50 }),
        headers: { "content-type": "application/json" },
      }),
    );
    assertEquals(requestResp.status, 200);
    const requestJson = await requestResp.json();
    assertEquals(requestJson.status, "pending");
    const withdrawalId = requestJson.withdrawalId as string;
    const pending = await store.findWithdrawalById(withdrawalId);
    if (!pending) throw new Error("pending withdrawal missing");
    assertEquals(pending.notice_expires_at !== null, true);
    const adminHandler = createWithdrawHandler({
      createStore: () => store,
      resolveProfile: () =>
        Promise.resolve({ profileId: adminProfile, telegramId: "201" }),
      now: () => new Date("2025-02-18T00:00:00Z"),
    });
    const approveResp = await adminHandler(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ requestId: withdrawalId, action: "approve" }),
        headers: { "content-type": "application/json" },
      }),
    );
    assertEquals(approveResp.status, 200);
    const approveJson = await approveResp.json();
    assertEquals(approveJson.status, "approved");
    assertEquals(approveJson.netAmountUsdt, 42);
    const activeCycle = await store.getActiveCycle();
    if (!activeCycle) throw new Error("active cycle missing after approval");
    const shares = await store.listShares(activeCycle.id);
    const shareA = shares.find((s) =>
      s.investor_id &&
      store.investors.get(s.investor_id)?.profile_id === investorProfile
    );
    const shareB = shares.find((s) =>
      s.investor_id &&
      store.investors.get(s.investor_id)?.profile_id === investorTwoProfile
    );
    if (!shareA || !shareB) throw new Error("share entries missing");
    assertEquals(Math.round(shareA.share_percentage * 100) / 100, 61.24);
    assertEquals(Math.round(shareB.share_percentage * 100) / 100, 38.76);
  },
);

function denoTest(name: string, fn: () => Promise<void> | void) {
  Deno.test(name, fn);
}
