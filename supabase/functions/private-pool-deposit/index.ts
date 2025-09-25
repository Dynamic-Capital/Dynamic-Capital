import {
  createDefaultResolveProfileFn,
  createSupabasePoolStore,
  ensureActiveCycle,
  ensureInvestor,
  type PrivatePoolStore,
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
}

const defaultDeps: DepositHandlerDeps = {
  createStore: createSupabasePoolStore,
  resolveProfile: createDefaultResolveProfileFn(),
  now: () => new Date(),
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
      return ok({
        ok: true,
        depositId: deposit.id,
        cycleId: cycle.id,
        sharePercentage: share?.share_percentage ?? 0,
        contributionUsdt: share?.contribution_usdt ?? roundCurrency(amount),
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
