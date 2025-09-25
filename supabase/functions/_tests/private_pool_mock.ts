import {
  type CycleStatus,
  type DepositType,
  type FundCycle,
  type Investor,
  type InvestorContact,
  type InvestorDeposit,
  type InvestorShare,
  type InvestorWithdrawal,
  type PrivatePoolStore,
  type Profile,
  roundCurrency,
  type WithdrawalStatus,
} from "../_shared/private-pool.ts";

export class MockPrivatePoolStore implements PrivatePoolStore {
  profiles = new Map<string, Profile>();
  investors = new Map<string, Investor>();
  fundCycles = new Map<string, FundCycle>();
  deposits: InvestorDeposit[] = [];
  withdrawals: InvestorWithdrawal[] = [];
  shares = new Map<string, InvestorShare>();

  constructor(init?: {
    profiles?: Profile[];
    investors?: Investor[];
    fundCycles?: FundCycle[];
    deposits?: InvestorDeposit[];
    withdrawals?: InvestorWithdrawal[];
    shares?: InvestorShare[];
  }) {
    for (const profile of init?.profiles ?? []) {
      this.profiles.set(profile.id, profile);
    }
    for (const investor of init?.investors ?? []) {
      this.investors.set(investor.id, investor);
    }
    for (const cycle of init?.fundCycles ?? []) {
      this.fundCycles.set(cycle.id, cycle);
    }
    this.deposits = [...(init?.deposits ?? [])];
    this.withdrawals = [...(init?.withdrawals ?? [])];
    for (const share of init?.shares ?? []) {
      this.shares.set(this.shareKey(share.cycle_id, share.investor_id), share);
    }
  }

  private shareKey(cycleId: string, investorId: string) {
    return `${cycleId}:${investorId}`;
  }

  findProfileById(id: string): Promise<Profile | null> {
    return Promise.resolve(this.profiles.get(id) ?? null);
  }

  findProfileByTelegramId(telegramId: string): Promise<Profile | null> {
    for (const profile of this.profiles.values()) {
      if (profile.telegram_id === telegramId) return profile;
    }
    return Promise.resolve(null);
  }

  getInvestorByProfileId(profileId: string): Promise<Investor | null> {
    for (const investor of this.investors.values()) {
      if (investor.profile_id === profileId) return investor;
    }
    return Promise.resolve(null);
  }

  createInvestor(profileId: string, joinedAt: string): Promise<Investor> {
    const investor: Investor = {
      id: crypto.randomUUID(),
      profile_id: profileId,
      status: "active",
      joined_at: joinedAt,
    };
    this.investors.set(investor.id, investor);
    return Promise.resolve(investor);
  }

  getActiveCycle(): Promise<FundCycle | null> {
    for (const cycle of this.fundCycles.values()) {
      if (cycle.status === "active") return cycle;
    }
    return Promise.resolve(null);
  }

  createCycle(data: {
    cycle_month: number;
    cycle_year: number;
    status?: CycleStatus;
    opened_at?: string;
  }): Promise<FundCycle> {
    const cycle: FundCycle = {
      id: crypto.randomUUID(),
      cycle_month: data.cycle_month,
      cycle_year: data.cycle_year,
      status: data.status ?? "active",
      profit_total_usdt: 0,
      investor_payout_usdt: 0,
      reinvested_total_usdt: 0,
      performance_fee_usdt: 0,
      payout_summary: [],
      notes: null,
      opened_at: data.opened_at ?? new Date().toISOString(),
      closed_at: null,
    };
    this.fundCycles.set(cycle.id, cycle);
    return Promise.resolve(cycle);
  }

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
  ): Promise<void> {
    const cycle = this.fundCycles.get(cycleId);
    if (!cycle) throw new Error("Cycle not found");
    cycle.status = changes.status;
    cycle.profit_total_usdt = changes.profit_total_usdt;
    cycle.investor_payout_usdt = changes.investor_payout_usdt;
    cycle.reinvested_total_usdt = changes.reinvested_total_usdt;
    cycle.performance_fee_usdt = changes.performance_fee_usdt;
    cycle.payout_summary = changes.payout_summary;
    cycle.closed_at = changes.closed_at;
    cycle.notes = changes.notes ?? null;
    return Promise.resolve();
  }

  insertDeposit(entry: {
    investor_id: string;
    cycle_id: string;
    amount_usdt: number;
    deposit_type?: DepositType;
    tx_hash?: string | null;
    notes?: string | null;
    created_at?: string;
  }): Promise<InvestorDeposit> {
    const deposit: InvestorDeposit = {
      id: crypto.randomUUID(),
      investor_id: entry.investor_id,
      cycle_id: entry.cycle_id,
      amount_usdt: roundCurrency(entry.amount_usdt),
      deposit_type: entry.deposit_type ?? "external",
      tx_hash: entry.tx_hash ?? null,
      notes: entry.notes ?? null,
      created_at: entry.created_at ?? new Date().toISOString(),
    };
    this.deposits.push(deposit);
    return Promise.resolve(deposit);
  }

  listDepositsByCycle(cycleId: string): Promise<InvestorDeposit[]> {
    return Promise.resolve(this.deposits.filter((d) => d.cycle_id === cycleId));
  }

  listWithdrawalsByCycle(
    cycleId: string,
    statuses: WithdrawalStatus[],
  ): Promise<InvestorWithdrawal[]> {
    const allowed = new Set(statuses);
    return Promise.resolve(
      this.withdrawals.filter((w) =>
        w.cycle_id === cycleId && (allowed.size === 0 || allowed.has(w.status))
      ),
    );
  }

  upsertShares(records: InvestorShare[]): Promise<void> {
    for (const record of records) {
      this.shares.set(this.shareKey(record.cycle_id, record.investor_id), {
        ...record,
        share_percentage: record.share_percentage,
        contribution_usdt: roundCurrency(record.contribution_usdt),
      });
    }
    return Promise.resolve();
  }

  listShares(cycleId: string): Promise<InvestorShare[]> {
    const out: InvestorShare[] = [];
    for (const record of this.shares.values()) {
      if (record.cycle_id === cycleId) out.push(record);
    }
    return Promise.resolve(out);
  }

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
  }): Promise<InvestorWithdrawal> {
    const withdrawal: InvestorWithdrawal = {
      id: crypto.randomUUID(),
      investor_id: entry.investor_id,
      cycle_id: entry.cycle_id,
      amount_usdt: roundCurrency(entry.amount_usdt),
      net_amount_usdt: entry.net_amount_usdt ?? null,
      reinvested_amount_usdt: entry.reinvested_amount_usdt ?? null,
      status: entry.status ?? "pending",
      requested_at: entry.requested_at ?? new Date().toISOString(),
      notice_expires_at: entry.notice_expires_at ?? null,
      fulfilled_at: null,
      admin_notes: entry.admin_notes ?? null,
    };
    this.withdrawals.push(withdrawal);
    return Promise.resolve(withdrawal);
  }

  updateWithdrawal(
    id: string,
    changes: Partial<InvestorWithdrawal>,
  ): Promise<InvestorWithdrawal | null> {
    const index = this.withdrawals.findIndex((w) => w.id === id);
    if (index === -1) return Promise.resolve(null);
    const current = this.withdrawals[index];
    const updated: InvestorWithdrawal = {
      ...current,
      ...changes,
    };
    this.withdrawals[index] = updated;
    return Promise.resolve(updated);
  }

  findWithdrawalById(id: string): Promise<InvestorWithdrawal | null> {
    return Promise.resolve(this.withdrawals.find((w) => w.id === id) ?? null);
  }

  listInvestorContacts(investorIds: string[]): Promise<InvestorContact[]> {
    const out: InvestorContact[] = [];
    const set = new Set(investorIds);
    for (const investor of this.investors.values()) {
      if (!set.has(investor.id)) continue;
      const profile = this.profiles.get(investor.profile_id);
      if (!profile) continue;
      out.push({
        investor_id: investor.id,
        profile_id: profile.id,
        telegram_id: profile.telegram_id ?? null,
        display_name: profile.display_name ?? null,
      });
    }
    return Promise.resolve(out);
  }
}
