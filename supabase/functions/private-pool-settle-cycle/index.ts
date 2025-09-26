import {
  createDefaultResolveProfileFn,
  createSupabasePoolStore,
  getNextCycle,
  type InvestorShare,
  type PrivatePoolStore,
  recomputeShares,
  requireAdmin,
  type ResolveProfileFn,
  roundCurrency,
} from "../_shared/private-pool.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { version } from "../_shared/version.ts";
import type { FundCycle, InvestorContact } from "../_shared/private-pool.ts";

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
  live_valuation_usdt: number;
  dct_balance: number;
  allocator_tx_hash?: string | null;
  loss_usdt?: number;
}

interface SettlementTotals {
  profit_total: number;
  payout_total: number;
  reinvest_total: number;
  performance_fee_total: number;
  loss_total: number;
}

export interface NotifyArgs {
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
  allocatorBridge: AllocatorBridge;
}

const defaultDeps: SettleHandlerDeps = {
  createStore: createSupabasePoolStore,
  resolveProfile: createDefaultResolveProfileFn(),
  now: () => new Date(),
  notifyInvestors: defaultNotifyInvestors,
  allocatorBridge: new NoopAllocatorBridge(),
};

interface AllocatorPayoutRequest {
  investorId: string;
  cycleId: string;
  amountUsdt: number;
  dctToSwap: number;
}

interface AllocatorBridge {
  cashOutPayout(
    request: AllocatorPayoutRequest,
  ): Promise<{ tonTxHash?: string | null } | void>;
}

class NoopAllocatorBridge implements AllocatorBridge {
  async cashOutPayout(): Promise<void> {
    return;
  }
}

function parseBody(raw: unknown): SettleBody {
  if (typeof raw !== "object" || raw === null) return {};
  return raw as SettleBody;
}

export function createSettleHandler(
  overrides: Partial<SettleHandlerDeps> = {},
) {
  const deps: SettleHandlerDeps = {
    ...defaultDeps,
    ...overrides,
  } as SettleHandlerDeps;
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
      const hasLoss = totalProfit <= 0;
      const summary: PayoutEntry[] = [];
      let payoutTotal = 0;
      let reinvestTotal = 0;
      let feeTotal = 0;
      for (const record of shareData.records) {
        const shareFraction = record.share_percentage / 100;
        const gross = roundCurrency(totalProfit * shareFraction);
        const payout = hasLoss ? 0 : roundCurrency(gross * 0.64);
        const reinvest = hasLoss ? 0 : roundCurrency(gross * 0.16);
        const fee = hasLoss ? 0 : roundCurrency(gross * 0.20);
        let loss = 0;
        if (hasLoss && gross < 0) {
          loss = Math.abs(gross);
        }
        payoutTotal += payout;
        reinvestTotal += reinvest;
        feeTotal += fee;
        const liveValuation =
          shareData.markedValuations.get(record.investor_id) ??
            record.contribution_usdt;
        const dctBalance = shareData.dctBalances.get(record.investor_id) ?? 0;
        let allocatorTx: string | null = null;
        if (payout > 0 && shareData.markPrice && dctBalance > 0) {
          const dctToSwap = shareData.markPrice > 0
            ? Number((payout / shareData.markPrice).toFixed(6))
            : 0;
          if (dctToSwap > 0) {
            try {
              const result = await deps.allocatorBridge.cashOutPayout({
                investorId: record.investor_id,
                cycleId: activeCycle.id,
                amountUsdt: payout,
                dctToSwap,
              });
              if (result && "tonTxHash" in result) {
                allocatorTx = result.tonTxHash ?? null;
              }
            } catch (bridgeErr) {
              console.error("allocatorBridge.cashOutPayout error", bridgeErr);
            }
          }
        }
        summary.push({
          investor_id: record.investor_id,
          share_percentage: record.share_percentage,
          contribution_usdt: record.contribution_usdt,
          gross_profit_usdt: gross,
          payout_usdt: payout,
          reinvest_usdt: reinvest,
          performance_fee_usdt: fee,
          live_valuation_usdt: roundCurrency(liveValuation),
          dct_balance: Number(dctBalance.toFixed(6)),
          allocator_tx_hash: allocatorTx,
          loss_usdt: loss > 0 ? roundCurrency(loss) : undefined,
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
      const nextMeta = getNextCycle(
        activeCycle.cycle_month,
        activeCycle.cycle_year,
      );
      const nextCycle = await store.createCycle({
        cycle_month: nextMeta.cycle_month,
        cycle_year: nextMeta.cycle_year,
        status: "active",
        opened_at: now.toISOString(),
      });
      for (const entry of summary) {
        const base = shareData.contributions.get(entry.investor_id) ?? 0;
        let carryoverBase = roundCurrency(base);
        if (hasLoss) {
          const adjusted = roundCurrency(base + entry.gross_profit_usdt);
          carryoverBase = Math.max(0, adjusted);
        }
        if (carryoverBase > 0) {
          await store.insertDeposit({
            investor_id: entry.investor_id,
            cycle_id: nextCycle.id,
            amount_usdt: carryoverBase,
            deposit_type: "carryover",
            notes:
              `Carryover from ${activeCycle.cycle_month}/${activeCycle.cycle_year}`,
            created_at: now.toISOString(),
            valuation_usdt: carryoverBase,
          });
        }
        if (!hasLoss && entry.reinvest_usdt > 0) {
          await store.insertDeposit({
            investor_id: entry.investor_id,
            cycle_id: nextCycle.id,
            amount_usdt: roundCurrency(entry.reinvest_usdt),
            deposit_type: "reinvestment",
            notes:
              `Reinvestment from ${activeCycle.cycle_month}/${activeCycle.cycle_year} settlement`,
            created_at: now.toISOString(),
            valuation_usdt: roundCurrency(entry.reinvest_usdt),
          });
        }
      }
      const newShares = await recomputeShares(store, nextCycle.id, now);
      const contacts = await store.listInvestorContacts(
        summary.map((s) => s.investor_id),
      );
      const totals: SettlementTotals = summary.reduce<SettlementTotals>(
        (acc, entry) => {
          acc.profit_total = roundCurrency(
            acc.profit_total + entry.gross_profit_usdt,
          );
          acc.payout_total = roundCurrency(
            acc.payout_total + entry.payout_usdt,
          );
          acc.reinvest_total = roundCurrency(
            acc.reinvest_total + entry.reinvest_usdt,
          );
          acc.performance_fee_total = roundCurrency(
            acc.performance_fee_total + entry.performance_fee_usdt,
          );
          const loss = entry.loss_usdt ?? 0;
          if (loss > 0) {
            acc.loss_total = roundCurrency(acc.loss_total + loss);
          }
          return acc;
        },
        {
          profit_total: 0,
          payout_total: 0,
          reinvest_total: 0,
          performance_fee_total: 0,
          loss_total: 0,
        },
      );
      totals.profit_total = roundCurrency(totalProfit);
      if (hasLoss) {
        totals.payout_total = 0;
        totals.reinvest_total = 0;
        totals.performance_fee_total = 0;
      }
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
      return oops(
        "Failed to settle cycle",
        err instanceof Error ? err.message : err,
        req,
      );
    }
  };
}

async function defaultNotifyInvestors(args: NotifyArgs): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  const summaryMap = new Map(
    args.summary.map((s) => [s.investor_id, s] as const),
  );
  const shareMap = new Map(
    args.newShares.map((s) => [s.investor_id, s] as const),
  );
  await Promise.allSettled(
    args.contacts
      .filter((contact) => contact.telegram_id)
      .map(async (contact) => {
        const entry = summaryMap.get(contact.investor_id);
        const share = shareMap.get(contact.investor_id);
        if (!entry || !share) return;
        const hasLoss = entry.loss_usdt !== undefined && entry.loss_usdt > 0;
        const profitLine = hasLoss
          ? `Loss share: ${entry.loss_usdt!.toFixed(2)} USDT`
          : `Profit share: ${entry.payout_usdt.toFixed(2)} USDT`;
        const reinvestLine = hasLoss
          ? "Reinvested: 0.00 USDT"
          : `Reinvested: ${entry.reinvest_usdt.toFixed(2)} USDT`;
        const feeLine = hasLoss
          ? "Performance fee: 0.00 USDT"
          : `Performance fee: ${entry.performance_fee_usdt.toFixed(2)} USDT`;
        const lines = [
          `Dynamic Capital – Private Fund Pool`,
          `Cycle ${args.cycle.cycle_month}/${args.cycle.cycle_year} settled.`,
          profitLine,
          reinvestLine,
          feeLine,
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
