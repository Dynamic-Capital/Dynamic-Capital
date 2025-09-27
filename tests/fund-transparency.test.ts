import test from 'node:test';
import { equal as assertEquals, deepEqual as assertDeepEqual } from 'node:assert/strict';
import { freshImport } from './utils/freshImport.ts';

test('buildFundTransparency aggregates supply and ROI metrics', async () => {
  const mod = await freshImport(new URL('../supabase/functions/fund-transparency/metrics.ts', import.meta.url));
  const metrics = mod.buildFundTransparency({
    subscriptions: [
      { dct_bought: 1000, dct_auto_invest: 200, dct_burned: 50 },
      { dct_bought: 500, dct_auto_invest: 100, dct_burned: 25 },
    ],
    fundCycles: [
      {
        cycle_year: 2024,
        cycle_month: 8,
        profit_total_usdt: 100,
        reinvested_total_usdt: 200,
        investor_payout_usdt: 50,
      },
      {
        cycle_year: 2024,
        cycle_month: 9,
        profit_total_usdt: -50,
        reinvested_total_usdt: 180,
        investor_payout_usdt: 20,
      },
    ],
    paymentIntents: [
      { user_id: 'user-1', status: 'approved' },
      { user_id: 'user-1', status: 'approved' },
      { user_id: 'user-2', status: 'pending' },
      { user_id: null, status: 'pending' },
      { user_id: 'user-3', status: 'cancelled' },
    ],
    emissions: [
      { epoch: 1, total_reward: 80 },
      { epoch: 2, total_reward: 120 },
    ],
  });

  assertEquals(metrics.totals.minted, 1500);
  assertEquals(metrics.totals.treasury, 300);
  assertEquals(metrics.totals.burned, 75);
  assertEquals(metrics.totals.circulating, 1125);
  assertEquals(metrics.totals.investorCount, 2);
  assertEquals(metrics.totals.latestReward, 120);

  assertEquals(metrics.supplyAllocation.length, 3);
  assertEquals(metrics.roiHistory.length, 2);
  assertDeepEqual(metrics.roiHistory[0], { period: '2024-08', roi: 50 });
  assertDeepEqual(metrics.roiHistory[1], { period: '2024-09', roi: -27.78 });

  assertEquals(metrics.drawdownHistory.length, 2);
  assertDeepEqual(metrics.drawdownHistory[1], { period: '2024-09', drawdown: -25 });
});

test('buildFundTransparency handles empty datasets', async () => {
  const mod = await freshImport(new URL('../supabase/functions/fund-transparency/metrics.ts', import.meta.url));
  const metrics = mod.buildFundTransparency({
    subscriptions: [],
    fundCycles: [],
    paymentIntents: [],
    emissions: [],
  });

  assertEquals(metrics.totals.circulating, 0);
  assertEquals(metrics.supplyAllocation.every((entry) => entry.value === 0), true);
  assertEquals(metrics.roiHistory.length, 0);
  assertEquals(metrics.drawdownHistory.length, 0);
});
