import { createClient, createSupabaseClient, type SupabaseClient } from "./client.ts";
import { getEnv } from "./env.ts";
import { verifyInitDataAndGetUser } from "./telegram.ts";

export type UserRole = "user" | "admin";
export type CycleStatus = "active" | "pending_settlement" | "settled";
export type DepositType = "external" | "reinvestment" | "carryover" | "adjustment";
export type WithdrawalStatus = "pending" | "approved" | "denied" | "fulfilled";

export interface Profile {
  id: string;
  role: UserRole;
  telegram_id: string | null;
  display_name: string | null;
}

export interface Investor {
  id: string;
  profile_id: string;
  status: string;
  joined_at: string;
}

export interface FundCycle {
  id: string;
  cycle_month: number;
  cycle_year: number;
  status: CycleStatus;
  profit_total_usdt: number;
  investor_payout_usdt: number;
  reinvested_total_usdt: number;
  performance_fee_usdt: number;
  payout_summary: unknown;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface InvestorDeposit {
  id: string;
  investor_id: string;
  cycle_id: string;
  amount_usdt: number;
  deposit_type: DepositType;
  tx_hash: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvestorWithdrawal {
  id: string;
  investor_id: string;
  cycle_id: string;
  amount_usdt: number;
  net_amount_usdt: number | null;
  reinvested_amount_usdt: number | null;
  status: WithdrawalStatus;
  requested_at: string;
  notice_expires_at: string | null;
  fulfilled_at: string | null;
  admin_notes: string | null;
}

export interface InvestorShare {
  investor_id: string;
  cycle_id: string;
  share_percentage: number;
  contribution_usdt: number;
  updated_at: string;
}

export interface InvestorContact {
  investor_id: string;
  profile_id: string;
  telegram_id: string | null;
  display_name: string | null;
}

export interface PrivatePoolStore {
  findProfileById(id: string): Promise<Profile | null>;
  findProfileByTelegramId(telegramId: string): Promise<Profile | null>;
  getInvestorByProfileId(profileId: string): Promise<Investor | null>;
  createInvestor(profileId: string, joinedAt: string): Promise<Investor>;
  getActiveCycle(): Promise<FundCycle | null>;
  createCycle(data: {
    cycle_month: number;
    cycle_year: number;
    status?: CycleStatus;
    opened_at?: string;
  }): Promise<FundCycle>;
  closeCycle(
    cycleId: string,
    changes: {
      status: CycleStatus;
      profit_total_usdt: number;
      investor_payout_usdt: number;
      reinvested_total_usdt: number;
      performance_fee_usdt: number;
      payout_summary: unknown;
      closed_at: string;
      notes?: string | null;
    },
  ): Promise<void>;
  insertDeposit(entry: {
    investor_id: string;
    cycle_id: string;
    amount_usdt: number;
    deposit_type?: DepositType;
    tx_hash?: string | null;
    notes?: string | null;
    created_at?: string;
  }): Promise<InvestorDeposit>;
  listDepositsByCycle(cycleId: string): Promise<InvestorDeposit[]>;
  listWithdrawalsByCycle(
    cycleId: string,
    statuses: WithdrawalStatus[],
  ): Promise<InvestorWithdrawal[]>;
  upsertShares(records: InvestorShare[]): Promise<void>;
  listShares(cycleId: string): Promise<InvestorShare[]>;
  createWithdrawal(entry: {
    investor_id: string;
    cycle_id: string;
    amount_usdt: number;
    status?: WithdrawalStatus;
    net_amount_usdt?: number | null;
    reinvested_amount_usdt?: number | null;
    notice_expires_at?: string | null;
    requested_at?: string;
    admin_notes?: string | null;
  }): Promise<InvestorWithdrawal>;
  updateWithdrawal(
    id: string,
    changes: Partial<InvestorWithdrawal>,
  ): Promise<InvestorWithdrawal | null>;
  findWithdrawalById(id: string): Promise<InvestorWithdrawal | null>;
  listInvestorContacts(investorIds: string[]): Promise<InvestorContact[]>;
}

function asNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type FundCycleRow = {
  id: string;
  cycle_month: number;
  cycle_year: number;
  status: CycleStatus;
  profit_total_usdt: number | null;
  investor_payout_usdt: number | null;
  reinvested_total_usdt: number | null;
  performance_fee_usdt: number | null;
  payout_summary: FundCycle["payout_summary"];
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
};

type InvestorDepositRow = {
  id: string;
  investor_id: string;
  cycle_id: string;
  amount_usdt: number | null;
  deposit_type: DepositType;
  tx_hash: string | null;
  notes: string | null;
  created_at: string;
};

type InvestorWithdrawalRow = {
  id: string;
  investor_id: string;
  cycle_id: string;
  amount_usdt: number | null;
  net_amount_usdt: number | null;
  reinvested_amount_usdt: number | null;
  status: WithdrawalStatus;
  requested_at: string;
  notice_expires_at: string | null;
  fulfilled_at: string | null;
  admin_notes: string | null;
};

export class SupabasePrivatePoolStore implements PrivatePoolStore {
  constructor(private readonly client: SupabaseClient) {}

  async findProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id, role, telegram_id, display_name")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`findProfileById failed: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      role: data.role as UserRole,
      telegram_id: data.telegram_id ?? null,
      display_name: data.display_name ?? null,
    };
  }

  async findProfileByTelegramId(telegramId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id, role, telegram_id, display_name")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (error) throw new Error(`findProfileByTelegramId failed: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      role: data.role as UserRole,
      telegram_id: data.telegram_id ?? null,
      display_name: data.display_name ?? null,
    };
  }

  async getInvestorByProfileId(profileId: string): Promise<Investor | null> {
    const { data, error } = await this.client
      .from("investors")
      .select("id, profile_id, status, joined_at")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) throw new Error(`getInvestorByProfileId failed: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      profile_id: data.profile_id,
      status: data.status,
      joined_at: data.joined_at,
    };
  }

  async createInvestor(profileId: string, joinedAt: string): Promise<Investor> {
    const { data, error } = await this.client
      .from("investors")
      .insert({ profile_id: profileId, joined_at: joinedAt })
      .select("id, profile_id, status, joined_at")
      .single();
    if (error) throw new Error(`createInvestor failed: ${error.message}`);
    return {
      id: data!.id,
      profile_id: data!.profile_id,
      status: data!.status,
      joined_at: data!.joined_at,
    };
  }

  async getActiveCycle(): Promise<FundCycle | null> {
    const { data, error } = await this.client
      .from("fund_cycles")
      .select(
        "id, cycle_month, cycle_year, status, profit_total_usdt, investor_payout_usdt, reinvested_total_usdt, performance_fee_usdt, payout_summary, notes, opened_at, closed_at",
      )
      .eq("status", "active")
      .order("opened_at", { ascending: false })
      .maybeSingle();
    if (error) throw new Error(`getActiveCycle failed: ${error.message}`);
    if (!data) return null;
    return this.mapFundCycle(data);
  }

  async createCycle(data: {
    cycle_month: number;
    cycle_year: number;
    status?: CycleStatus;
    opened_at?: string;
  }): Promise<FundCycle> {
    const payload = {
      cycle_month: data.cycle_month,
      cycle_year: data.cycle_year,
      status: data.status ?? "active",
      opened_at: data.opened_at,
    };
    const { data: inserted, error } = await this.client
      .from("fund_cycles")
      .insert(payload)
      .select(
        "id, cycle_month, cycle_year, status, profit_total_usdt, investor_payout_usdt, reinvested_total_usdt, performance_fee_usdt, payout_summary, notes, opened_at, closed_at",
      )
      .single();
    if (error) throw new Error(`createCycle failed: ${error.message}`);
    return this.mapFundCycle(inserted!);
  }

  async closeCycle(
    cycleId: string,
    changes: {
      status: CycleStatus;
      profit_total_usdt: number;
      investor_payout_usdt: number;
      reinvested_total_usdt: number;
      performance_fee_usdt: number;
      payout_summary: unknown;
      closed_at: string;
      notes?: string | null;
    },
  ): Promise<void> {
    const { error } = await this.client
      .from("fund_cycles")
      .update({
        status: changes.status,
        profit_total_usdt: changes.profit_total_usdt,
        investor_payout_usdt: changes.investor_payout_usdt,
        reinvested_total_usdt: changes.reinvested_total_usdt,
        performance_fee_usdt: changes.performance_fee_usdt,
        payout_summary: changes.payout_summary,
        closed_at: changes.closed_at,
        updated_at: changes.closed_at,
        notes: changes.notes ?? null,
      })
      .eq("id", cycleId);
    if (error) throw new Error(`closeCycle failed: ${error.message}`);
  }

  async insertDeposit(entry: {
    investor_id: string;
    cycle_id: string;
    amount_usdt: number;
    deposit_type?: DepositType;
    tx_hash?: string | null;
    notes?: string | null;
    created_at?: string;
  }): Promise<InvestorDeposit> {
    const { data, error } = await this.client
      .from("investor_deposits")
      .insert({
        investor_id: entry.investor_id,
        cycle_id: entry.cycle_id,
        amount_usdt: entry.amount_usdt,
        deposit_type: entry.deposit_type ?? "external",
        tx_hash: entry.tx_hash ?? null,
        notes: entry.notes ?? null,
        created_at: entry.created_at,
      })
      .select("id, investor_id, cycle_id, amount_usdt, deposit_type, tx_hash, notes, created_at")
      .single();
    if (error) throw new Error(`insertDeposit failed: ${error.message}`);
    return this.mapDeposit(data!);
  }

  async listDepositsByCycle(cycleId: string): Promise<InvestorDeposit[]> {
    const { data, error } = await this.client
      .from("investor_deposits")
      .select("id, investor_id, cycle_id, amount_usdt, deposit_type, tx_hash, notes, created_at")
      .eq("cycle_id", cycleId);
    if (error) throw new Error(`listDepositsByCycle failed: ${error.message}`);
    return (data ?? []).map((row) => this.mapDeposit(row));
  }

  async listWithdrawalsByCycle(
    cycleId: string,
    statuses: WithdrawalStatus[],
  ): Promise<InvestorWithdrawal[]> {
    const query = this.client
      .from("investor_withdrawals")
      .select(
        "id, investor_id, cycle_id, amount_usdt, net_amount_usdt, reinvested_amount_usdt, status, requested_at, notice_expires_at, fulfilled_at, admin_notes",
      )
      .eq("cycle_id", cycleId);
    const builder = statuses.length > 0 ? query.in("status", statuses) : query;
    const { data, error } = await builder;
    if (error) throw new Error(`listWithdrawalsByCycle failed: ${error.message}`);
    return (data ?? []).map((row) => this.mapWithdrawal(row));
  }

  async upsertShares(records: InvestorShare[]): Promise<void> {
    if (records.length === 0) return;
    const payload = records.map((r) => ({
      investor_id: r.investor_id,
      cycle_id: r.cycle_id,
      share_percentage: r.share_percentage,
      contribution_usdt: r.contribution_usdt,
      updated_at: r.updated_at,
    }));
    const { error } = await this.client.from("investor_shares").upsert(payload);
    if (error) throw new Error(`upsertShares failed: ${error.message}`);
  }

  async listShares(cycleId: string): Promise<InvestorShare[]> {
    const { data, error } = await this.client
      .from("investor_shares")
      .select("investor_id, cycle_id, share_percentage, contribution_usdt, updated_at")
      .eq("cycle_id", cycleId);
    if (error) throw new Error(`listShares failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      investor_id: row.investor_id,
      cycle_id: row.cycle_id,
      share_percentage: asNumber(row.share_percentage),
      contribution_usdt: asNumber(row.contribution_usdt),
      updated_at: row.updated_at,
    }));
  }

  async createWithdrawal(entry: {
    investor_id: string;
    cycle_id: string;
    amount_usdt: number;
    status?: WithdrawalStatus;
    net_amount_usdt?: number | null;
    reinvested_amount_usdt?: number | null;
    notice_expires_at?: string | null;
    requested_at?: string;
    admin_notes?: string | null;
  }): Promise<InvestorWithdrawal> {
    const { data, error } = await this.client
      .from("investor_withdrawals")
      .insert({
        investor_id: entry.investor_id,
        cycle_id: entry.cycle_id,
        amount_usdt: entry.amount_usdt,
        status: entry.status ?? "pending",
        net_amount_usdt: entry.net_amount_usdt ?? null,
        reinvested_amount_usdt: entry.reinvested_amount_usdt ?? null,
        notice_expires_at: entry.notice_expires_at ?? null,
        requested_at: entry.requested_at,
        admin_notes: entry.admin_notes ?? null,
      })
      .select(
        "id, investor_id, cycle_id, amount_usdt, net_amount_usdt, reinvested_amount_usdt, status, requested_at, notice_expires_at, fulfilled_at, admin_notes",
      )
      .single();
    if (error) throw new Error(`createWithdrawal failed: ${error.message}`);
    return this.mapWithdrawal(data!);
  }

  async updateWithdrawal(
    id: string,
    changes: Partial<InvestorWithdrawal>,
  ): Promise<InvestorWithdrawal | null> {
    const payload = { ...changes } as Record<string, unknown>;
    const { data, error } = await this.client
      .from("investor_withdrawals")
      .update(payload)
      .eq("id", id)
      .select(
        "id, investor_id, cycle_id, amount_usdt, net_amount_usdt, reinvested_amount_usdt, status, requested_at, notice_expires_at, fulfilled_at, admin_notes",
      )
      .maybeSingle();
    if (error) throw new Error(`updateWithdrawal failed: ${error.message}`);
    return data ? this.mapWithdrawal(data) : null;
  }

  async findWithdrawalById(id: string): Promise<InvestorWithdrawal | null> {
    const { data, error } = await this.client
      .from("investor_withdrawals")
      .select(
        "id, investor_id, cycle_id, amount_usdt, net_amount_usdt, reinvested_amount_usdt, status, requested_at, notice_expires_at, fulfilled_at, admin_notes",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`findWithdrawalById failed: ${error.message}`);
    return data ? this.mapWithdrawal(data) : null;
  }

  async listInvestorContacts(investorIds: string[]): Promise<InvestorContact[]> {
    if (investorIds.length === 0) return [];
    const { data, error } = await this.client
      .from("investors")
      .select("id, profile_id, profiles(telegram_id, display_name)")
      .in("id", investorIds);
    if (error) throw new Error(`listInvestorContacts failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      investor_id: row.id,
      profile_id: row.profile_id,
      telegram_id: row.profiles?.telegram_id ?? null,
      display_name: row.profiles?.display_name ?? null,
    }));
  }

  private mapFundCycle(row: FundCycleRow): FundCycle {
    return {
      id: row.id,
      cycle_month: row.cycle_month,
      cycle_year: row.cycle_year,
      status: row.status,
      profit_total_usdt: asNumber(row.profit_total_usdt),
      investor_payout_usdt: asNumber(row.investor_payout_usdt),
      reinvested_total_usdt: asNumber(row.reinvested_total_usdt),
      performance_fee_usdt: asNumber(row.performance_fee_usdt),
      payout_summary: row.payout_summary,
      notes: row.notes ?? null,
      opened_at: row.opened_at,
      closed_at: row.closed_at ?? null,
    };
  }

  private mapDeposit(row: InvestorDepositRow): InvestorDeposit {
    return {
      id: row.id,
      investor_id: row.investor_id,
      cycle_id: row.cycle_id,
      amount_usdt: asNumber(row.amount_usdt),
      deposit_type: row.deposit_type,
      tx_hash: row.tx_hash ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at,
    };
  }

  private mapWithdrawal(row: InvestorWithdrawalRow): InvestorWithdrawal {
    return {
      id: row.id,
      investor_id: row.investor_id,
      cycle_id: row.cycle_id,
      amount_usdt: asNumber(row.amount_usdt),
      net_amount_usdt: row.net_amount_usdt !== null && row.net_amount_usdt !== undefined
        ? asNumber(row.net_amount_usdt)
        : null,
      reinvested_amount_usdt: row.reinvested_amount_usdt !== null && row.reinvested_amount_usdt !== undefined
        ? asNumber(row.reinvested_amount_usdt)
        : null,
      status: row.status,
      requested_at: row.requested_at,
      notice_expires_at: row.notice_expires_at ?? null,
      fulfilled_at: row.fulfilled_at ?? null,
      admin_notes: row.admin_notes ?? null,
    };
  }
}

export function createSupabasePoolStore(): SupabasePrivatePoolStore {
  return new SupabasePrivatePoolStore(createClient("service"));
}

export function roundCurrency(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function getCycleMonthYear(date: Date): { cycle_month: number; cycle_year: number } {
  return { cycle_month: date.getUTCMonth() + 1, cycle_year: date.getUTCFullYear() };
}

export function getNextCycle(month: number, year: number): { cycle_month: number; cycle_year: number } {
  if (month === 12) return { cycle_month: 1, cycle_year: year + 1 };
  return { cycle_month: month + 1, cycle_year: year };
}

export async function ensureInvestor(
  store: PrivatePoolStore,
  profileId: string,
  now: Date,
): Promise<Investor> {
  const existing = await store.getInvestorByProfileId(profileId);
  if (existing) return existing;
  return await store.createInvestor(profileId, now.toISOString());
}

export async function ensureActiveCycle(
  store: PrivatePoolStore,
  now: Date,
): Promise<FundCycle> {
  const active = await store.getActiveCycle();
  if (active) return active;
  const { cycle_month, cycle_year } = getCycleMonthYear(now);
  return await store.createCycle({ cycle_month, cycle_year, status: "active", opened_at: now.toISOString() });
}

export interface ShareComputationResult {
  totalContribution: number;
  contributions: Map<string, number>;
  records: InvestorShare[];
}

export async function recomputeShares(
  store: PrivatePoolStore,
  cycleId: string,
  now: Date,
): Promise<ShareComputationResult> {
  const deposits = await store.listDepositsByCycle(cycleId);
  const contributions = new Map<string, number>();
  for (const deposit of deposits) {
    const prev = contributions.get(deposit.investor_id) ?? 0;
    contributions.set(deposit.investor_id, prev + deposit.amount_usdt);
  }
  const withdrawals = await store.listWithdrawalsByCycle(cycleId, ["approved", "fulfilled"]);
  for (const withdrawal of withdrawals) {
    const net = withdrawal.net_amount_usdt ?? 0;
    if (net <= 0) continue;
    const prev = contributions.get(withdrawal.investor_id) ?? 0;
    const next = prev - net;
    contributions.set(withdrawal.investor_id, next > 0 ? next : 0);
  }
  const existingShares = await store.listShares(cycleId);
  const allInvestorIds = new Set<string>([
    ...contributions.keys(),
    ...existingShares.map((s) => s.investor_id),
  ]);
  const totalContribution = Array.from(contributions.values()).reduce((acc, val) => acc + val, 0);
  const records: InvestorShare[] = [];
  for (const investorId of allInvestorIds) {
    const contribution = contributions.get(investorId) ?? 0;
    const share = totalContribution > 0 ? (contribution / totalContribution) * 100 : 0;
    records.push({
      investor_id: investorId,
      cycle_id: cycleId,
      share_percentage: Number(share.toFixed(6)),
      contribution_usdt: roundCurrency(contribution),
      updated_at: now.toISOString(),
    });
  }
  if (records.length > 0) await store.upsertShares(records);
  return { totalContribution: roundCurrency(totalContribution), contributions, records };
}

export interface AuthContext {
  profileId: string;
  telegramId: string | null;
}

export type ResolveProfileFn = (
  req: Request,
  body: unknown,
  store: PrivatePoolStore,
) => Promise<AuthContext | null>;

type AuthClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; user_metadata?: { telegram_id?: string | null } } | null };
      error: { message?: string } | null;
    }>;
  };
};

export interface ResolveProfileOptions {
  getAuthClient?: (authHeader: string) => Promise<AuthClient>;
  verifyInitData?: (initData: string) => Promise<{ id: number } | null>;
}

function defaultGetAuthClient(authHeader: string): Promise<AuthClient> {
  const url = getEnv("SUPABASE_URL");
  const anon = getEnv("SUPABASE_ANON_KEY");
  const client = createSupabaseClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  return Promise.resolve(client as unknown as AuthClient);
}

export function createDefaultResolveProfileFn(
  options: ResolveProfileOptions = {},
): ResolveProfileFn {
  const getAuthClient = options.getAuthClient ?? defaultGetAuthClient;
  const verifyInitData = options.verifyInitData ?? (async (initData: string) => {
    const user = await verifyInitDataAndGetUser(initData);
    return user ? { id: user.id } : null;
  });
  return async (req, body, store) => {
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const auth = await getAuthClient(authHeader);
        const { data, error } = await auth.auth.getUser();
        if (error) throw new Error(error.message ?? "auth.getUser failed");
        const user = data?.user;
        if (user) {
          const profile = await store.findProfileById(user.id);
          if (profile) {
            return {
              profileId: profile.id,
              telegramId: profile.telegram_id ?? user.user_metadata?.telegram_id ?? null,
            };
          }
        }
      } catch (err) {
        console.error("resolveProfile auth error", err);
      }
    }
    const initData =
      typeof body === "object" && body !== null && "initData" in (body as Record<string, unknown>)
        ? String((body as Record<string, unknown>).initData ?? "")
        : null;
    if (initData) {
      try {
        const telegramUser = await verifyInitData(initData);
        if (telegramUser) {
          const profile = await store.findProfileByTelegramId(String(telegramUser.id));
          if (profile) {
            return { profileId: profile.id, telegramId: profile.telegram_id ?? String(telegramUser.id) };
          }
        }
      } catch (err) {
        console.error("resolveProfile telegram error", err);
      }
    }
    return null;
  };
}

export async function requireAdmin(store: PrivatePoolStore, profileId: string): Promise<boolean> {
  const profile = await store.findProfileById(profileId);
  return profile?.role === "admin";
}
