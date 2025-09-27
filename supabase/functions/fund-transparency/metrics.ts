export interface SubscriptionRow {
  dct_bought: number | null;
  dct_auto_invest: number | null;
  dct_burned: number | null;
}

export interface FundCycleRow {
  cycle_year: number | null;
  cycle_month: number | null;
  profit_total_usdt: number | null;
  reinvested_total_usdt: number | null;
  investor_payout_usdt: number | null;
}

export interface PaymentIntentRow {
  user_id: string | null;
  status: string | null;
}

export interface EmissionRow {
  epoch: number | null;
  total_reward: number | null;
}

export interface FundTransparencyMetrics {
  supplyAllocation: { name: string; value: number }[];
  stats: {
    label: string;
    value: number;
    unit: string;
    helper: string | null;
  }[];
  roiHistory: { period: string; roi: number }[];
  drawdownHistory: { period: string; drawdown: number }[];
  totals: {
    minted: number;
    treasury: number;
    burned: number;
    circulating: number;
    investorCount: number;
    latestReward: number;
  };
  lastUpdated: string;
}

function toNumber(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value);
  }
  return 0;
}

function formatPeriod(year: number | null, month: number | null): string {
  if (!year || !month) return "Unknown";
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function buildFundTransparency(payload: {
  subscriptions: SubscriptionRow[];
  fundCycles: FundCycleRow[];
  paymentIntents: PaymentIntentRow[];
  emissions: EmissionRow[];
}): FundTransparencyMetrics {
  const totalBought = payload.subscriptions.reduce(
    (sum, row) => sum + toNumber(row.dct_bought),
    0,
  );
  const totalAutoInvest = payload.subscriptions.reduce(
    (sum, row) => sum + toNumber(row.dct_auto_invest),
    0,
  );
  const totalBurned = payload.subscriptions.reduce(
    (sum, row) => sum + toNumber(row.dct_burned),
    0,
  );
  const circulating = Math.max(totalBought - totalAutoInvest - totalBurned, 0);

  const uniqueInvestors = new Set<string>();
  for (const intent of payload.paymentIntents) {
    const userId = intent.user_id?.trim();
    if (!userId) continue;
    if (intent.status && intent.status.toLowerCase() === "cancelled") continue;
    uniqueInvestors.add(userId);
  }

  const sortedCycles = [...payload.fundCycles].sort((a, b) => {
    const ay = toNumber(a.cycle_year);
    const by = toNumber(b.cycle_year);
    if (ay !== by) return ay - by;
    return toNumber(a.cycle_month) - toNumber(b.cycle_month);
  });

  const roiHistory = sortedCycles
    .map((cycle) => {
      const base = toNumber(cycle.reinvested_total_usdt);
      if (base <= 0) return null;
      const profit = toNumber(cycle.profit_total_usdt);
      const roi = Number(((profit / base) * 100).toFixed(2));
      return {
        period: formatPeriod(cycle.cycle_year, cycle.cycle_month),
        roi,
      };
    })
    .filter((entry): entry is { period: string; roi: number } =>
      entry !== null
    );

  const drawdownHistory = sortedCycles
    .map((cycle) => {
      const base = toNumber(cycle.reinvested_total_usdt) +
        toNumber(cycle.investor_payout_usdt);
      if (base <= 0) return null;
      const profit = toNumber(cycle.profit_total_usdt);
      const drawdown = profit < 0
        ? Number(((profit / base) * 100).toFixed(2))
        : 0;
      return {
        period: formatPeriod(cycle.cycle_year, cycle.cycle_month),
        drawdown,
      };
    })
    .filter((entry): entry is { period: string; drawdown: number } =>
      entry !== null
    );

  const latestEmission =
    [...payload.emissions].sort((a, b) =>
      toNumber(b.epoch) - toNumber(a.epoch)
    )[0];
  const latestReward = latestEmission
    ? toNumber(latestEmission.total_reward)
    : 0;

  const mintedSafe = totalBought > 0 ? totalBought : 1;
  const supplyAllocation = [
    { name: "Circulating", value: Number(circulating.toFixed(2)) },
    { name: "Treasury", value: Number(totalAutoInvest.toFixed(2)) },
    { name: "Burned", value: Number(totalBurned.toFixed(2)) },
  ];

  const stats = [
    {
      label: "Circulating Supply",
      value: Number(circulating.toFixed(2)),
      unit: "DCAP",
      helper: `${
        Number(((circulating / mintedSafe) * 100).toFixed(2))
      }% of minted supply`,
    },
    {
      label: "Total Burned",
      value: Number(totalBurned.toFixed(2)),
      unit: "DCAP",
      helper: `${
        Number(((totalBurned / mintedSafe) * 100).toFixed(2))
      }% permanently removed`,
    },
    {
      label: "Active Investors",
      value: uniqueInvestors.size,
      unit: "wallets",
      helper: `${payload.paymentIntents.length} payment intents tracked`,
    },
    {
      label: "Current Epoch Rewards",
      value: Number(latestReward.toFixed(2)),
      unit: "USDT",
      helper: latestEmission ? `Epoch ${latestEmission.epoch}` : null,
    },
  ];

  return {
    supplyAllocation,
    stats,
    roiHistory,
    drawdownHistory,
    totals: {
      minted: Number(totalBought.toFixed(2)),
      treasury: Number(totalAutoInvest.toFixed(2)),
      burned: Number(totalBurned.toFixed(2)),
      circulating: Number(circulating.toFixed(2)),
      investorCount: uniqueInvestors.size,
      latestReward: Number(latestReward.toFixed(2)),
    },
    lastUpdated: new Date().toISOString(),
  };
}
