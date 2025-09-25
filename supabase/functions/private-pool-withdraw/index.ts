import {
  createDefaultResolveProfileFn,
  createSupabasePoolStore,
  ensureActiveCycle,
  ensureInvestor,
  type PrivatePoolStore,
  recomputeShares,
  requireAdmin,
  type ResolveProfileFn,
  roundCurrency,
} from "../_shared/private-pool.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";
import { version } from "../_shared/version.ts";

type AdminAction = "approve" | "deny";

interface WithdrawBody {
  amount?: number;
  initData?: string;
  notes?: string;
  requestId?: string;
  action?: AdminAction;
  adminNotes?: string;
}

interface WithdrawHandlerDeps {
  createStore: () => PrivatePoolStore;
  resolveProfile: ResolveProfileFn;
  now: () => Date;
  allocatorBridge: WithdrawAllocatorBridge;
}

const defaultDeps: WithdrawHandlerDeps = {
  createStore: createSupabasePoolStore,
  resolveProfile: createDefaultResolveProfileFn(),
  now: () => new Date(),
  allocatorBridge: new NoopWithdrawBridge(),
};

interface WithdrawAllocatorRequest {
  investorId: string;
  cycleId: string;
  amountUsdt: number;
  dctToSwap: number;
}

interface WithdrawAllocatorBridge {
  release(
    request: WithdrawAllocatorRequest,
  ): Promise<{ tonTxHash?: string | null } | void>;
}

class NoopWithdrawBridge implements WithdrawAllocatorBridge {
  async release(): Promise<void> {
    return;
  }
}

function parseBody(raw: unknown): WithdrawBody {
  if (typeof raw !== "object" || raw === null) return {};
  return raw as WithdrawBody;
}

function addDays(date: Date, days: number): string {
  const next = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

export function createWithdrawHandler(
  overrides: Partial<WithdrawHandlerDeps> = {},
) {
  const deps: WithdrawHandlerDeps = { ...defaultDeps, ...overrides };
  return async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(req) });
    }
    const v = version(req, "private-pool-withdraw");
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

    const now = deps.now();

    try {
      if (body.action) {
        if (!body.requestId) {
          return bad("Missing requestId", undefined, req);
        }
        const admin = await requireAdmin(store, profile.profileId);
        if (!admin) return unauth("Admin access required", req);
        const withdrawal = await store.findWithdrawalById(body.requestId);
        if (!withdrawal) {
          return bad("Withdrawal not found", undefined, req);
        }
        if (body.action === "deny") {
          const updated = await store.updateWithdrawal(withdrawal.id, {
            status: "denied",
            admin_notes: body.adminNotes ?? withdrawal.admin_notes ?? null,
          });
          return ok({
            ok: true,
            status: updated?.status ?? "denied",
            withdrawalId: withdrawal.id,
          }, req);
        }
        if (withdrawal.status !== "pending") {
          return bad("Withdrawal already processed", undefined, req);
        }
        const preShare = await recomputeShares(store, withdrawal.cycle_id, now);
        const netAmount = roundCurrency(withdrawal.amount_usdt * 0.84);
        const reinvestment = roundCurrency(withdrawal.amount_usdt - netAmount);
        let allocatorTxHash: string | null = null;
        const markPrice = preShare.markPrice ?? null;
        const dctBalance = preShare.dctBalances.get(withdrawal.investor_id) ??
          0;
        if (markPrice && markPrice > 0 && dctBalance > 0 && netAmount > 0) {
          const dctToSwap = Number((netAmount / markPrice).toFixed(6));
          if (dctToSwap > 0) {
            try {
              const res = await deps.allocatorBridge.release({
                investorId: withdrawal.investor_id,
                cycleId: withdrawal.cycle_id,
                amountUsdt: netAmount,
                dctToSwap,
              });
              if (res && "tonTxHash" in res) {
                allocatorTxHash = res.tonTxHash ?? null;
              }
            } catch (bridgeErr) {
              console.error("withdraw allocator release error", bridgeErr);
            }
          }
        }
        const updated = await store.updateWithdrawal(withdrawal.id, {
          status: "approved",
          fulfilled_at: now.toISOString(),
          net_amount_usdt: netAmount,
          reinvested_amount_usdt: reinvestment,
          admin_notes: body.adminNotes ?? withdrawal.admin_notes ?? null,
          ton_tx_hash: allocatorTxHash,
        });
        const shareResult = await recomputeShares(
          store,
          withdrawal.cycle_id,
          now,
        );
        const share = shareResult.records.find((r) =>
          r.investor_id === withdrawal.investor_id
        );
        return ok({
          ok: true,
          status: updated?.status ?? "approved",
          withdrawalId: withdrawal.id,
          netAmountUsdt: netAmount,
          reinvestedAmountUsdt: reinvestment,
          sharePercentage: share?.share_percentage ?? 0,
          contributionUsdt: share?.contribution_usdt ?? 0,
          allocatorTxHash: allocatorTxHash,
          markPrice: markPrice,
          dctBalance: dctBalance,
        }, req);
      }

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return bad("Invalid amount", undefined, req);
      }
      const investor = await ensureInvestor(store, profile.profileId, now);
      const cycle = await ensureActiveCycle(store, now);
      const shareResult = await recomputeShares(store, cycle.id, now);
      const available = shareResult.markedValuations.get(investor.id) ??
        shareResult.contributions.get(investor.id) ?? 0;
      if (available <= 0) {
        return bad("No active balance", undefined, req);
      }
      if (amount > available) {
        return bad(
          "Requested amount exceeds available balance",
          undefined,
          req,
        );
      }
      const withdrawal = await store.createWithdrawal({
        investor_id: investor.id,
        cycle_id: cycle.id,
        amount_usdt: roundCurrency(amount),
        notice_expires_at: addDays(now, 7),
        requested_at: now.toISOString(),
        admin_notes: body.notes ?? null,
        ton_tx_hash: null,
      });
      return ok({
        ok: true,
        withdrawalId: withdrawal.id,
        status: withdrawal.status,
        cycleId: cycle.id,
        noticeExpiresAt: withdrawal.notice_expires_at,
        availableContribution: roundCurrency(available),
        markPrice: shareResult.markPrice ?? null,
        dctBalance: shareResult.dctBalances.get(investor.id) ?? 0,
      }, req);
    } catch (err) {
      console.error("private-pool-withdraw error", err);
      return oops(
        "Failed to process withdrawal",
        err instanceof Error ? err.message : err,
        req,
      );
    }
  };
}

export const handler = createWithdrawHandler();

registerHandler(handler);

export default handler;
