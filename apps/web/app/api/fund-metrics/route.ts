import { createClient } from "@/integrations/supabase/client";
import { corsHeaders, json, methodNotAllowed, oops } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

type SubscriptionRow = {
  user_id?: string | null;
  ton_paid?: number | string | null;
  operations_ton?: number | string | null;
  ops_ton?: number | string | null;
  auto_invest_ton?: number | string | null;
  burn_ton?: number | string | null;
  dct_bought?: number | string | null;
  dct_auto_invest?: number | string | null;
  dct_burned?: number | string | null;
  created_at?: string | null;
};

type StakeRow = {
  user_id?: string | null;
  status?: string | null;
  weight?: number | string | null;
};

type EmissionEventRow = {
  epoch?: number | string | null;
  reward_amount?: number | string | null;
  snapshot_weight?: number | string | null;
};

type EmissionRow = {
  epoch?: number | string | null;
  total_reward?: number | string | null;
};

type FundMetricsPayload = {
  supplyAllocation: { name: string; value: number }[];
  roiHistory: { epoch: string; roi: number }[];
  totals: {
    circulatingSupply: number;
    treasuryHoldings: number;
    totalBurned: number;
    activeInvestors: number;
    activeWallets: number;
    currentEpochRewards: number;
    operationsTon: number;
    autoInvestTon: number;
    burnTon: number;
    tonPaid: number;
  };
  changes: {
    circulatingPct: number | null;
    burnSharePct: number | null;
    investorParticipationPct: number | null;
    rewardsRoi: number | null;
  };
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function safeDateKey(raw: string | null | undefined, index: number): string {
  if (!raw) return `bucket-${index}`;
  const date = new Date(raw);
  if (Number.isNaN(date.valueOf())) {
    return `bucket-${index}`;
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function GET(req: Request) {
  const supabase = createClient("service");

  const {
    data: subscriptions,
    error: subscriptionsError,
  } = await supabase
    .from("dct_subscriptions")
    .select(
      "user_id,ton_paid,operations_ton,ops_ton,auto_invest_ton,burn_ton,dct_bought,dct_auto_invest,dct_burned,created_at",
    )
    .order("created_at", { ascending: true });

  if (subscriptionsError) {
    console.error(
      "[fund-metrics] Failed to load subscriptions",
      subscriptionsError,
    );
    return oops("Unable to load fund metrics", undefined, req);
  }

  const subscriptionsData = (subscriptions ?? []) as SubscriptionRow[];

  const [stakesResult, usersResult, emissionsResult, emissionEventsResult] =
    await Promise
      .all([
        supabase
          .from("dct_stakes")
          .select("user_id,status,weight"),
        supabase
          .from("dct_users")
          .select("id"),
        supabase
          .from("dct_emissions")
          .select("epoch,total_reward")
          .order("epoch", { ascending: false })
          .limit(1),
        supabase
          .from("dct_emission_events")
          .select("epoch,reward_amount,snapshot_weight")
          .order("epoch", { ascending: true }),
      ])
      .catch((error) => {
        console.error("[fund-metrics] Failed to load supporting tables", error);
        return [
          { data: [], error: error as Error },
          { data: [], error: error as Error },
          { data: [], error: error as Error },
          { data: [], error: error as Error },
        ];
      });

  const stakesData = Array.isArray(stakesResult?.data)
    ? (stakesResult.data as StakeRow[])
    : [];
  if (stakesResult?.error) {
    console.warn("[fund-metrics] Stakes query failed", stakesResult.error);
  }

  const usersData = Array.isArray(usersResult?.data) ? usersResult.data : [];
  if (usersResult?.error) {
    console.warn("[fund-metrics] Users query failed", usersResult.error);
  }

  const emissionsData = Array.isArray(emissionsResult?.data)
    ? (emissionsResult.data as EmissionRow[])
    : [];
  if (emissionsResult?.error) {
    console.warn(
      "[fund-metrics] Emissions query failed",
      emissionsResult.error,
    );
  }

  const emissionEventsData = Array.isArray(emissionEventsResult?.data)
    ? (emissionEventsResult.data as EmissionEventRow[])
    : [];
  if (emissionEventsResult?.error) {
    console.warn(
      "[fund-metrics] Emission events query failed",
      emissionEventsResult.error,
    );
  }

  let totalTonPaid = 0;
  let totalOpsTon = 0;
  let totalAutoInvestTon = 0;
  let totalBurnTon = 0;
  let totalDctBought = 0;
  let totalDctAutoInvest = 0;
  let totalDctBurned = 0;

  const monthlyBuckets = new Map<
    string,
    { tonPaid: number; dctInvest: number; dctBurned: number }
  >();
  const subscriptionUsers = new Set<string>();

  subscriptionsData.forEach((row, index) => {
    const tonPaid = toNumber(row.ton_paid);
    totalTonPaid += tonPaid;

    const opsTon = toNumber(row.operations_ton ?? row.ops_ton ?? 0);
    totalOpsTon += opsTon;

    const autoInvestTon = toNumber(row.auto_invest_ton ?? 0);
    totalAutoInvestTon += autoInvestTon;

    const burnTon = toNumber(row.burn_ton ?? 0);
    totalBurnTon += burnTon;

    const dctBought = toNumber(row.dct_bought);
    totalDctBought += dctBought;

    const dctAutoInvest = toNumber(row.dct_auto_invest ?? row.dct_bought ?? 0);
    totalDctAutoInvest += dctAutoInvest;

    const dctBurned = toNumber(row.dct_burned);
    totalDctBurned += dctBurned;

    const key = safeDateKey(row.created_at ?? null, index);
    const bucket = monthlyBuckets.get(key) ??
      { tonPaid: 0, dctInvest: 0, dctBurned: 0 };
    bucket.tonPaid += tonPaid;
    bucket.dctInvest += dctAutoInvest;
    bucket.dctBurned += dctBurned;
    monthlyBuckets.set(key, bucket);

    if (row.user_id) {
      subscriptionUsers.add(row.user_id);
    }
  });

  if (totalAutoInvestTon === 0) {
    totalAutoInvestTon = Math.max(totalTonPaid - totalOpsTon - totalBurnTon, 0);
  }

  const treasuryDct = Math.max(
    totalDctBought - totalDctAutoInvest - totalDctBurned,
    0,
  );

  const sortedBuckets = Array.from(monthlyBuckets.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  let cumulativeInvest = 0;
  let cumulativeBurn = 0;
  let prevCirculating = 0;
  let currentCirculating = Math.max(totalDctAutoInvest - totalDctBurned, 0);

  sortedBuckets.forEach(([, bucket], idx) => {
    cumulativeInvest += bucket.dctInvest;
    cumulativeBurn += bucket.dctBurned;
    const value = Math.max(cumulativeInvest - cumulativeBurn, 0);
    if (idx === sortedBuckets.length - 2) {
      prevCirculating = value;
    }
    if (idx === sortedBuckets.length - 1) {
      currentCirculating = value;
    }
  });

  const burnSharePct = totalDctBought > 0
    ? (totalDctBurned / totalDctBought) * 100
    : null;

  const uniqueActiveInvestors = new Set<string>();
  stakesData.forEach((stake) => {
    const status = (stake.status ?? "active").toString().toLowerCase();
    if (status === "active" && stake.user_id) {
      uniqueActiveInvestors.add(stake.user_id);
    }
  });

  if (uniqueActiveInvestors.size === 0) {
    subscriptionUsers.forEach((id) => uniqueActiveInvestors.add(id));
  }

  const walletCount = usersData.length;
  const investorParticipationPct = walletCount > 0
    ? (uniqueActiveInvestors.size / walletCount) * 100
    : null;

  const roiBuckets = new Map<number, { reward: number; weight: number }>();
  emissionEventsData.forEach((event) => {
    const epoch = Number(event.epoch);
    if (!Number.isFinite(epoch)) return;
    const entry = roiBuckets.get(epoch) ?? { reward: 0, weight: 0 };
    entry.reward += toNumber(event.reward_amount);
    entry.weight += toNumber(event.snapshot_weight);
    roiBuckets.set(epoch, entry);
  });

  let roiHistory = Array.from(roiBuckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([epoch, aggregate]) => ({
      epoch: `E${epoch}`,
      roi: aggregate.weight > 0
        ? (aggregate.reward / aggregate.weight) * 100
        : 0,
    }));

  if (roiHistory.length === 0) {
    roiHistory = sortedBuckets.map(([label, bucket], index) => ({
      epoch: label.startsWith("bucket-") ? `P${index + 1}` : label,
      roi: bucket.tonPaid > 0 ? (bucket.dctInvest / bucket.tonPaid) * 100 : 0,
    }));
  }

  if (roiHistory.length > 12) {
    roiHistory = roiHistory.slice(-12);
  }

  const currentEpochRewards = emissionsData?.[0]
    ? toNumber(emissionsData[0].total_reward)
    : 0;

  const circulatingChange = prevCirculating > 0
    ? ((currentCirculating - prevCirculating) / prevCirculating) * 100
    : null;

  const metrics: FundMetricsPayload = {
    supplyAllocation: [
      { name: "Circulating", value: currentCirculating },
      { name: "Treasury", value: treasuryDct },
      { name: "Burned", value: totalDctBurned },
    ],
    roiHistory,
    totals: {
      circulatingSupply: currentCirculating,
      treasuryHoldings: treasuryDct,
      totalBurned: totalDctBurned,
      activeInvestors: uniqueActiveInvestors.size,
      activeWallets: walletCount,
      currentEpochRewards,
      operationsTon: totalOpsTon,
      autoInvestTon: totalAutoInvestTon,
      burnTon: totalBurnTon,
      tonPaid: totalTonPaid,
    },
    changes: {
      circulatingPct: circulatingChange,
      burnSharePct,
      investorParticipationPct,
      rewardsRoi: roiHistory.length > 0
        ? roiHistory[roiHistory.length - 1].roi
        : null,
    },
  };

  return json({ ok: true, data: metrics }, 200, {}, req);
}

export function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req, "GET"),
  });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
