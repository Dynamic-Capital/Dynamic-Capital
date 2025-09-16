import { createSupabasePoolStore, recomputeShares, requireAdmin, type PrivatePoolStore, type ResolveProfileFn, createDefaultResolveProfileFn, roundCurrency, getNextCycle, type InvestorShare } from "../_shared/private-pool.ts";
import { ok, bad, unauth, mna, oops, corsHeaders } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { version } from "../_shared/version.ts";
import type { InvestorContact, FundCycle } from "../_shared/private-pool.ts";

interface SettleBody {
  profit?: number;
  notes?: string;
  initData?: string;
}

interface PayoutEntry {
  investor_id: string;
  share_percentage: number;
  contribution_usdt: number;
  gross_profit_usdt: number;
  payout_usdt: number;
  reinvest_usdt: number;
  performance_fee_usdt: number;
}

interface SettlementTotals {
  profit_total: number;
  payout_total: number;
  reinvest_total: number;
  performance_fee_total: number;
}

interface NotifyArgs {
  cycle: FundCycle;
  summary: PayoutEntry[];
  newShares: InvestorShare[];
  contacts: InvestorContact[];
  totals: SettlementTotals;
  nextCycle: FundCycle;
  notes?: string | null;
}

interface SettleHandlerDeps {
  createStore: () => PrivatePoolStore;
  resolveProfile: ResolveProfileFn;
  now: () => Date;
  notifyInvestors: (args: NotifyArgs) => Promise<void>;
}

const defaultDeps: SettleHandlerDeps = {
  createStore: createSupabasePoolStore,
  resolveProfile: createDefaultResolveProfileFn(),
  now: () => new Date(),
  notifyInvestors: defaultNotifyInvestors,
};

function parseBody(raw: unknown): SettleBody {
  if (typeof raw !== "object" || raw === null) return {};
  return raw as SettleBody;
}

export function createSettleHandler(
  overrides: Partial<SettleHandlerDeps> = {},
) {
  const deps: SettleHandlerDeps = { ...defaultDeps, ...overrides } as SettleHandlerDeps;
  return async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(req) });
    }
    const v = version(req, "private-pool-settle-cycle");
    if (v) return v;
    if (req.method !== "POST") return mna();
    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return bad("Bad JSON", undefined, req);
    }
    const body = parseBody(bodyRaw);
    const store = deps.createStore();
    const profile = await deps.resolveProfile(req, body, store);
    if (!profile) {
      return unauth("Unauthorized", req);
    }
    const isAdmin = await requireAdmin(store, profile.profileId);
    if (!isAdmin) return unauth("Admin access required", req);
    const now = deps.now();
    const profit = Number(body.profit);
    if (!Number.isFinite(profit)) {
      return bad("Invalid profit amount", undefined, req);
    }
    try {
      const activeCycle = await store.getActiveCycle();
      if (!activeCycle) {
        return bad("No active cycle to settle", undefined, req);
      }
      const shareData = await recomputeShares(store, activeCycle.id, now);
      const totalProfit = roundCurrency(profit);
      const summary: PayoutEntry[] = [];
      let payoutTotal = 0;
      let reinvestTotal = 0;
      let feeTotal = 0;
      for (const record of shareData.records) {
        const shareFraction = record.share_percentage / 100;
        const gross = roundCurrency(totalProfit * shareFraction);
        const payout = roundCurrency(gross * 0.64);
        const reinvest = roundCurrency(gross * 0.16);
        const fee = roundCurrency(gross * 0.20);
        payoutTotal += payout;
        reinvestTotal += reinvest;
        feeTotal += fee;
        summary.push({
          investor_id: record.investor_id,
          share_percentage: record.share_percentage,
          contribution_usdt: record.contribution_usdt,
          gross_profit_usdt: gross,
          payout_usdt: payout,
          reinvest_usdt: reinvest,
          performance_fee_usdt: fee,
        });
      }
      await store.closeCycle(activeCycle.id, {
        status: "settled",
        profit_total_usdt: totalProfit,
        investor_payout_usdt: roundCurrency(payoutTotal),
        reinvested_total_usdt: roundCurrency(reinvestTotal),
        performance_fee_usdt: roundCurrency(feeTotal),
        payout_summary: summary,
        closed_at: now.toISOString(),
        notes: body.notes ?? null,
      });
      const nextMeta = getNextCycle(activeCycle.cycle_month, activeCycle.cycle_year);
      const nextCycle = await store.createCycle({
        cycle_month: nextMeta.cycle_month,
        cycle_year: nextMeta.cycle_year,
        status: "active",
        opened_at: now.toISOString(),
      });
      for (const entry of summary) {
        const base = shareData.contributions.get(entry.investor_id) ?? 0;
        if (base > 0) {
          await store.insertDeposit({
            investor_id: entry.investor_id,
            cycle_id: nextCycle.id,
            amount_usdt: roundCurrency(base),
            deposit_type: "carryover",
            notes: `Carryover from ${activeCycle.cycle_month}/${activeCycle.cycle_year}`,
            created_at: now.toISOString(),
          });
        }
        if (entry.reinvest_usdt > 0) {
          await store.insertDeposit({
            investor_id: entry.investor_id,
            cycle_id: nextCycle.id,
            amount_usdt: roundCurrency(entry.reinvest_usdt),
            deposit_type: "reinvestment",
            notes: `Reinvestment from ${activeCycle.cycle_month}/${activeCycle.cycle_year} settlement`,
            created_at: now.toISOString(),
          });
        }
      }
      const newShares = await recomputeShares(store, nextCycle.id, now);
      const contacts = await store.listInvestorContacts(summary.map((s) => s.investor_id));
      const totals: SettlementTotals = {
        profit_total: totalProfit,
        payout_total: roundCurrency(payoutTotal),
        reinvest_total: roundCurrency(reinvestTotal),
        performance_fee_total: roundCurrency(feeTotal),
      };
      await deps.notifyInvestors({
        cycle: activeCycle,
        summary,
        newShares: newShares.records,
        contacts,
        totals,
        nextCycle,
        notes: body.notes ?? null,
      });
      return ok({
        ok: true,
        cycleId: activeCycle.id,
        closedAt: now.toISOString(),
        totals,
        payoutSummary: summary,
        nextCycle: {
          id: nextCycle.id,
          cycle_month: nextCycle.cycle_month,
          cycle_year: nextCycle.cycle_year,
        },
        newShareDistribution: newShares.records,
      }, req);
    } catch (err) {
      console.error("private-pool-settle-cycle error", err);
      return oops("Failed to settle cycle", err instanceof Error ? err.message : err, req);
    }
  };
}

async function defaultNotifyInvestors(args: NotifyArgs): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  const summaryMap = new Map(args.summary.map((s) => [s.investor_id, s] as const));
  const shareMap = new Map(args.newShares.map((s) => [s.investor_id, s] as const));
  await Promise.allSettled(
    args.contacts
      .filter((contact) => contact.telegram_id)
      .map(async (contact) => {
        const entry = summaryMap.get(contact.investor_id);
        const share = shareMap.get(contact.investor_id);
        if (!entry || !share) return;
        const lines = [
          `Dynamic Capital – Private Fund Pool`,
          `Cycle ${args.cycle.cycle_month}/${args.cycle.cycle_year} settled.`,
          `Profit share: ${entry.payout_usdt.toFixed(2)} USDT`,
          `Reinvested: ${entry.reinvest_usdt.toFixed(2)} USDT`,
          `Performance fee: ${entry.performance_fee_usdt.toFixed(2)} USDT`,
          `New share: ${share.share_percentage.toFixed(2)}%`,
        ];
        if (args.notes) {
          lines.push(`Notes: ${args.notes}`);
        }
        const body = JSON.stringify({
          chat_id: contact.telegram_id,
          text: lines.join("\n"),
        });
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
      }),
  );
}

export const handler = createSettleHandler();

registerHandler(handler);

export default handler;
