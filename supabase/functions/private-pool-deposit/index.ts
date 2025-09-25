import {
  createDefaultResolveProfileFn,
  createSupabasePoolStore,
  ensureActiveCycle,
  ensureInvestor,
  type PrivatePoolStore,
  type Profile,
  recomputeShares,
  type ResolveProfileFn,
  roundCurrency,
} from "../_shared/private-pool.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { version } from "../_shared/version.ts";

interface DepositBody {
  amount?: number;
  txHash?: string;
  initData?: string;
  notes?: string;
}

interface DepositHandlerDeps {
  createStore: () => PrivatePoolStore;
  resolveProfile: ResolveProfileFn;
  now: () => Date;
  notifyDeposit: (args: NotifyDepositArgs) => Promise<void>;
}

export interface NotifyDepositArgs {
  telegramId: string | null;
  displayName: string | null;
  amountUsdt: number;
  sharePercentage: number;
  contributionUsdt: number;
  cycleMonth: number;
  cycleYear: number;
}

const defaultDeps: DepositHandlerDeps = {
  createStore: createSupabasePoolStore,
  resolveProfile: createDefaultResolveProfileFn(),
  now: () => new Date(),
  notifyDeposit: defaultNotifyDeposit,
};

function parseBody(raw: unknown): DepositBody {
  if (typeof raw !== "object" || raw === null) return {};
  return raw as DepositBody;
}

export function createDepositHandler(
  overrides: Partial<DepositHandlerDeps> = {},
) {
  const deps: DepositHandlerDeps = { ...defaultDeps, ...overrides };
  return async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(req) });
    }
    const v = version(req, "private-pool-deposit");
    if (v) return v;
    if (req.method !== "POST") return mna();
    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return bad("Bad JSON", undefined, req);
    }
    const body = parseBody(bodyRaw);
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return bad("Invalid amount", undefined, req);
    }
    const store = deps.createStore();
    const profile = await deps.resolveProfile(req, body, store);
    if (!profile) {
      return unauth("Unauthorized", req);
    }
    try {
      const now = deps.now();
      const investor = await ensureInvestor(store, profile.profileId, now);
      const cycle = await ensureActiveCycle(store, now);
      const deposit = await store.insertDeposit({
        investor_id: investor.id,
        cycle_id: cycle.id,
        amount_usdt: roundCurrency(amount),
        tx_hash: body.txHash ?? null,
        notes: body.notes ?? null,
        deposit_type: "external",
        created_at: now.toISOString(),
      });
      const shareResult = await recomputeShares(store, cycle.id, now);
      const share = shareResult.records.find((r) =>
        r.investor_id === investor.id
      );
      let profileRecord: Profile | null = null;
      try {
        profileRecord = await store.findProfileById(profile.profileId);
      } catch (profileErr) {
        console.error("private-pool-deposit profile lookup error", profileErr);
      }
      const sharePercentage = share?.share_percentage ?? 0;
      const contributionUsdt = share?.contribution_usdt ??
        roundCurrency(amount);
      try {
        await deps.notifyDeposit({
          telegramId: profile.telegramId ?? profileRecord?.telegram_id ?? null,
          displayName: profileRecord?.display_name ?? null,
          amountUsdt: roundCurrency(amount),
          sharePercentage,
          contributionUsdt,
          cycleMonth: cycle.cycle_month,
          cycleYear: cycle.cycle_year,
        });
      } catch (notifyErr) {
        console.error("private-pool-deposit notify error", notifyErr);
      }
      return ok({
        ok: true,
        depositId: deposit.id,
        cycleId: cycle.id,
        sharePercentage,
        contributionUsdt,
        totalCycleContribution: shareResult.totalContribution,
      }, req);
    } catch (err) {
      console.error("private-pool-deposit error", err);
      return oops(
        "Failed to record deposit",
        err instanceof Error ? err.message : err,
        req,
      );
    }
  };
}

export const handler = createDepositHandler();

registerHandler(handler);

export default handler;

function formatUsdt(value: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} USDT`;
}

async function defaultNotifyDeposit(args: NotifyDepositArgs): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  if (!args.telegramId) return;
  const amount = formatUsdt(args.amountUsdt);
  const share = `${args.sharePercentage.toFixed(2)}%`;
  const contribution = formatUsdt(args.contributionUsdt);
  const cycleLabel = `${
    String(args.cycleMonth).padStart(2, "0")
  }/${args.cycleYear}`;
  const name = args.displayName ?? "Investor";
  const lines = [
    "📢 Welcome to Dynamic Capital – Private Fund Pool 🚀",
    "",
    `Dear ${name},`,
    `Your contribution of ${amount} has been added to the ${cycleLabel} pool ✅.`,
    "",
    "💠 Your Allocation:",
    ` • Contribution recorded: ${contribution}`,
    ` • Current share: ${share}`,
    " • Profit split each settlement:",
    "    • 64% → Paid to you",
    "    • 16% → Reinvested automatically",
    "    • 20% → Performance fee",
    "",
    "💠 Reporting & Transparency:",
    " • 📊 Monthly PDF report with balance, profit/loss & risk notes",
    " • 🔍 Verified stats via Myfxbook/FXBlue tracking",
    " • ✏️ Payout log for every distribution and reinvestment",
    "",
    "💠 Withdrawal Policy:",
    " • Capital lock: 1 month minimum",
    " • Profit withdrawals available monthly",
    " • 7-day notice required before capital withdrawal",
    "",
    "💠 Risk Management:",
    " • Daily max drawdown target: 3–5%",
    " • Total max drawdown cap: 10%",
    " • Hedge system protects equity during volatility spikes",
    "",
    "Thank you for trusting Dynamic Capital. Let’s grow together 🌱",
    "",
    "— Support: @DynamicCapital_Support",
  ];
  const body = JSON.stringify({
    chat_id: args.telegramId,
    text: lines.join("\n"),
  });
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}
