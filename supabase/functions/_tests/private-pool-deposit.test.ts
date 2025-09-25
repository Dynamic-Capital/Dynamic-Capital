import { assertEquals } from "std/assert/mod.ts";
import {
  createDepositHandler,
  type NotifyDepositArgs,
} from "../private-pool-deposit/index.ts";
import { MockPrivatePoolStore } from "./private_pool_mock.ts";

denoTest(
  "private-pool-deposit records deposit and recalculates shares",
  async () => {
    const profileId = "profile-1";
    const store = new MockPrivatePoolStore({
      profiles: [
        {
          id: profileId,
          role: "user",
          telegram_id: "100",
          display_name: "Alice",
        },
      ],
    });
    const notifications: NotifyDepositArgs[] = [];
    const handler = createDepositHandler({
      createStore: () => store,
      resolveProfile: () => Promise.resolve({ profileId, telegramId: "100" }),
      now: () => new Date("2025-01-01T00:00:00Z"),
      notifyDeposit: (args) => {
        notifications.push(args);
        return Promise.resolve();
      },
    });
    const resp = await handler(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ amount: 150 }),
        headers: { "content-type": "application/json" },
      }),
    );
    assertEquals(resp.status, 200);
    const json = await resp.json();
    assertEquals(json.ok, true);
    assertEquals(json.sharePercentage, 100);
    assertEquals(json.totalCycleContribution, 150);
    assertEquals(store.deposits.length, 1);
    const activeCycle = await store.getActiveCycle();
    if (!activeCycle) throw new Error("active cycle missing");
    const shares = await store.listShares(activeCycle.id);
    assertEquals(shares.length, 1);
    assertEquals(shares[0].share_percentage, 100);
    assertEquals(notifications.length, 1);
    assertEquals(notifications[0].telegramId, "100");
    assertEquals(notifications[0].displayName, "Alice");
    assertEquals(notifications[0].amountUsdt, 150);
    assertEquals(notifications[0].sharePercentage, 100);
    assertEquals(notifications[0].cycleMonth, 1);
    assertEquals(notifications[0].cycleYear, 2025);
  },
);

denoTest("private-pool-deposit rejects invalid amount", async () => {
  const store = new MockPrivatePoolStore({
    profiles: [
      {
        id: "profile-2",
        role: "user",
        telegram_id: "200",
        display_name: "Bob",
      },
    ],
  });
  const notifications: NotifyDepositArgs[] = [];
  const handler = createDepositHandler({
    createStore: () => store,
    resolveProfile: () =>
      Promise.resolve({ profileId: "profile-2", telegramId: "200" }),
    now: () => new Date("2025-01-01T00:00:00Z"),
    notifyDeposit: (args) => {
      notifications.push(args);
      return Promise.resolve();
    },
  });
  const resp = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ amount: -10 }),
      headers: { "content-type": "application/json" },
    }),
  );
  assertEquals(resp.status, 400);
  assertEquals(notifications.length, 0);
});

function denoTest(name: string, fn: () => Promise<void> | void) {
  Deno.test(name, fn);
}
