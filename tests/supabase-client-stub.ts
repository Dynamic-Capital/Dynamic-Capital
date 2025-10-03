type SignalStatus =
  | "pending"
  | "claimed"
  | "processing"
  | "executed"
  | "failed"
  | "cancelled";

type SignalDispatchStatus =
  | "pending"
  | "claimed"
  | "processing"
  | "completed"
  | "failed";

type TradeStatus =
  | "pending"
  | "executing"
  | "partial_fill"
  | "filled"
  | "failed"
  | "cancelled";

type HedgeActionSide = "LONG_HEDGE" | "SHORT_HEDGE";
type HedgeActionReason = "ATR_SPIKE" | "NEWS" | "DD_LIMIT";
type HedgeActionStatus = "OPEN" | "CLOSED" | "CANCELLED";

type TradingAccountStatus = "active" | "maintenance" | "disabled";

interface TradingAccountRow {
  id: string;
  account_code: string;
  display_name: string | null;
  broker: string | null;
  environment: string;
  status: TradingAccountStatus;
  metadata: unknown;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SignalRow {
  id: string;
  alert_id: string;
  account_id: string | null;
  source: string;
  symbol: string;
  timeframe: string | null;
  direction: string;
  order_type: string;
  status: SignalStatus;
  priority: number;
  payload: unknown;
  error_reason: string | null;
  next_poll_at: string;
  acknowledged_at: string | null;
  last_heartbeat_at: string | null;
  executed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SignalDispatchRow {
  id: string;
  signal_id: string;
  worker_id: string;
  status: SignalDispatchStatus;
  retry_count: number;
  metadata: unknown;
  claimed_at: string;
  last_heartbeat_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TradeRow {
  id: string;
  signal_id: string | null;
  account_id: string | null;
  mt5_ticket_id: string | null;
  status: TradeStatus;
  symbol: string;
  direction: string;
  order_type: string;
  volume: number | null;
  requested_price: number | null;
  filled_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  execution_payload: unknown;
  error_reason: string | null;
  opened_at: string;
  filled_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface HedgeActionRow {
  id: string;
  symbol: string;
  hedge_symbol: string;
  side: HedgeActionSide;
  qty: number;
  reason: HedgeActionReason;
  status: HedgeActionStatus;
  entry_price: number | null;
  close_price: number | null;
  pnl: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  closed_at: string | null;
}

interface StubState {
  payments: Map<string, Record<string, unknown>>;
  userSubscriptions: Map<string, Record<string, unknown>>;
  receiptsByHash: Map<string, Record<string, unknown>>;
  storageFiles: Map<string, Blob>;
  tradingAccounts: Map<string, TradingAccountRow>;
  signals: Map<string, SignalRow>;
  signalDispatches: Map<string, SignalDispatchRow>;
  trades: Map<string, TradeRow>;
  tradeTickets: Map<string, string>;
  hedgeActions: Map<string, HedgeActionRow>;
}

const stubState: StubState = {
  payments: new Map(),
  userSubscriptions: new Map(),
  receiptsByHash: new Map(),
  storageFiles: new Map(),
  tradingAccounts: new Map(),
  signals: new Map(),
  signalDispatches: new Map(),
  trades: new Map(),
  tradeTickets: new Map(),
  hedgeActions: new Map(),
};

export const __testSupabaseState = stubState;

export function __resetSupabaseState() {
  stubState.payments.clear();
  stubState.userSubscriptions.clear();
  stubState.receiptsByHash.clear();
  stubState.storageFiles.clear();
  stubState.tradingAccounts.clear();
  stubState.signals.clear();
  stubState.signalDispatches.clear();
  stubState.trades.clear();
  stubState.tradeTickets.clear();
  stubState.hedgeActions.clear();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isoNow(): string {
  return new Date().toISOString();
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

type QueryBuilder<T> = {
  eq(field: string, value: unknown): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  maybeSingle(): Promise<{ data: T | null; error: { message: string } | null }>;
  single(): Promise<{ data: T | null; error: { message: string } | null }>;
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((
        value: { data: T[]; error: { message: string } | null },
      ) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2>;
  get(): Promise<{ data: T[]; error: { message: string } | null }>;
};

function createQueryBuilder<T extends Record<string, unknown>>(
  rows: T[],
): QueryBuilder<T> {
  let results = rows.map((row) => clone(row));
  const builder: Partial<QueryBuilder<T>> = {
    eq(field: string, value: unknown) {
      results = results.filter((row) => row[field] === value);
      return builder as QueryBuilder<T>;
    },
    order(column: string, options?: { ascending?: boolean }) {
      const asc = options?.ascending !== false;
      results.sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv) return 0;
        if (av === undefined) return asc ? 1 : -1;
        if (bv === undefined) return asc ? -1 : 1;
        if (typeof av === "number" && typeof bv === "number") {
          return asc ? av - bv : bv - av;
        }
        const as = String(av);
        const bs = String(bv);
        return asc ? as.localeCompare(bs) : bs.localeCompare(as);
      });
      return builder as QueryBuilder<T>;
    },
    limit(count: number) {
      results = results.slice(0, count);
      return builder as QueryBuilder<T>;
    },
    range(from: number, to: number) {
      results = results.slice(from, to + 1);
      return builder as QueryBuilder<T>;
    },
    async maybeSingle() {
      return { data: results[0] ?? null, error: null };
    },
    async single() {
      if (results.length === 1) {
        return { data: results[0], error: null };
      }
      if (results.length === 0) {
        return { data: null, error: { message: "no rows" } };
      }
      return { data: null, error: { message: "multiple rows" } };
    },
    then(onfulfilled, onrejected) {
      return (builder as QueryBuilder<T>)
        .get()
        .then(onfulfilled, onrejected);
    },
    async get() {
      return { data: results.map((row) => clone(row)), error: null };
    },
  };
  return builder as QueryBuilder<T>;
}

function paymentsHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return {
        eq(field: string, value: unknown) {
          const key = String(value);
          const row = field === "id" ? state.payments.get(key) ?? null : null;
          return {
            async maybeSingle() {
              return { data: row ? clone(row) : null, error: null };
            },
          };
        },
      };
    },
    update(values: Record<string, unknown>) {
      return {
        eq(field: string, value: unknown) {
          const key = String(value);
          if (field !== "id") {
            return { data: null, error: { message: "unsupported field" } };
          }
          const existing = state.payments.get(key);
          if (!existing) {
            return { data: null, error: { message: "not found" } };
          }
          const updated = { ...existing, ...values };
          state.payments.set(key, updated);
          return { data: [clone(updated)], error: null };
        },
      };
    },
    insert(values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      for (const row of rows) {
        const id = String(row.id ?? crypto.randomUUID());
        state.payments.set(id, { id, ...row });
      }
      return { data: rows.map((row) => clone(row)), error: null };
    },
    delete() {
      return {
        eq(field: string, value: unknown) {
          const key = String(value);
          if (field === "id") {
            state.payments.delete(key);
          }
          return { data: [], error: null };
        },
      };
    },
  };
}

function userSubscriptionsHandlers(state: StubState) {
  return {
    update(values: Record<string, unknown>) {
      return {
        eq(field: string, value: unknown) {
          const key = String(value);
          if (field !== "telegram_user_id") {
            return { data: null, error: { message: "unsupported field" } };
          }
          const existing = state.userSubscriptions.get(key) ??
            { telegram_user_id: key };
          const updated = { ...existing, ...values };
          state.userSubscriptions.set(key, updated);
          return { data: [clone(updated)], error: null };
        },
      };
    },
  };
}

function receiptsHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return {
        eq(field: string, value: unknown) {
          const hash = String(value);
          const record = field === "image_sha256"
            ? state.receiptsByHash.get(hash) ?? null
            : null;
          return {
            limit() {
              return this;
            },
            async maybeSingle() {
              return { data: record ? clone(record) : null, error: null };
            },
          };
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          return { data: null, error: null };
        },
      };
    },
    insert(values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      for (const row of rows) {
        const hash = String(row.image_sha256 ?? "");
        if (!hash) continue;
        state.receiptsByHash.set(hash, { ...row });
      }
      return { data: rows.map((row) => clone(row)), error: null };
    },
  };
}

function tradingAccountsHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return createQueryBuilder(Array.from(state.tradingAccounts.values()));
    },
    insert(values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      const inserted: TradingAccountRow[] = [];
      for (const row of rows) {
        if (!row.account_code) {
          return { data: null, error: { message: "account_code required" } };
        }
        const id = String(row.id ?? crypto.randomUUID());
        const now = isoNow();
        const record: TradingAccountRow = {
          id,
          account_code: String(row.account_code),
          display_name: row.display_name === undefined
            ? null
            : row.display_name === null
            ? null
            : String(row.display_name),
          broker: row.broker === undefined
            ? null
            : row.broker === null
            ? null
            : String(row.broker),
          environment: String(row.environment ?? "demo"),
          status: (row.status as TradingAccountStatus) ?? "active",
          metadata: row.metadata ?? {},
          last_heartbeat_at: row.last_heartbeat_at === undefined
            ? null
            : row.last_heartbeat_at === null
            ? null
            : String(row.last_heartbeat_at),
          created_at: row.created_at ? String(row.created_at) : now,
          updated_at: row.updated_at ? String(row.updated_at) : now,
        };
        state.tradingAccounts.set(id, record);
        inserted.push(record);
      }
      const data = inserted.map((row) => clone(row));
      return {
        data,
        error: null,
        select() {
          return Promise.resolve({ data, error: null });
        },
      };
    },
    update(values: Record<string, unknown>) {
      return {
        eq(field: string, value: unknown) {
          if (field !== "id") {
            return { data: null, error: { message: "unsupported field" } };
          }
          const key = String(value);
          const existing = state.tradingAccounts.get(key);
          if (!existing) {
            return { data: null, error: { message: "not found" } };
          }
          const updated: TradingAccountRow = {
            ...existing,
            ...values,
            updated_at: values.updated_at
              ? String(values.updated_at)
              : isoNow(),
          };
          state.tradingAccounts.set(key, updated);
          return { data: [clone(updated)], error: null };
        },
      };
    },
  };
}

function signalsHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return createQueryBuilder(Array.from(state.signals.values()));
    },
    insert(values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      const inserted: SignalRow[] = [];
      for (const row of rows) {
        if (!row.alert_id || !row.symbol || !row.direction) {
          return { data: null, error: { message: "missing required fields" } };
        }
        const id = String(row.id ?? crypto.randomUUID());
        if (
          Array.from(state.signals.values()).some((sig) =>
            sig.alert_id === row.alert_id
          )
        ) {
          return { data: null, error: { message: "duplicate alert_id" } };
        }
        const now = isoNow();
        const record: SignalRow = {
          id,
          alert_id: String(row.alert_id),
          account_id: row.account_id === undefined
            ? null
            : row.account_id === null
            ? null
            : String(row.account_id),
          source: String(row.source ?? "tradingview"),
          symbol: String(row.symbol),
          timeframe: row.timeframe === undefined
            ? null
            : row.timeframe === null
            ? null
            : String(row.timeframe),
          direction: String(row.direction),
          order_type: String(row.order_type ?? "market"),
          status: (row.status as SignalStatus) ?? "pending",
          priority: Number(row.priority ?? 0),
          payload: row.payload ?? {},
          error_reason: row.error_reason === undefined
            ? null
            : row.error_reason === null
            ? null
            : String(row.error_reason),
          next_poll_at: row.next_poll_at ? String(row.next_poll_at) : now,
          acknowledged_at: row.acknowledged_at === undefined
            ? null
            : row.acknowledged_at === null
            ? null
            : String(row.acknowledged_at),
          last_heartbeat_at: row.last_heartbeat_at === undefined
            ? null
            : row.last_heartbeat_at === null
            ? null
            : String(row.last_heartbeat_at),
          executed_at: row.executed_at === undefined
            ? null
            : row.executed_at === null
            ? null
            : String(row.executed_at),
          cancelled_at: row.cancelled_at === undefined
            ? null
            : row.cancelled_at === null
            ? null
            : String(row.cancelled_at),
          created_at: row.created_at ? String(row.created_at) : now,
          updated_at: row.updated_at ? String(row.updated_at) : now,
        };
        state.signals.set(id, record);
        inserted.push(record);
      }
      const data = inserted.map((row) => clone(row));
      return {
        data,
        error: null,
        select() {
          return Promise.resolve({ data, error: null });
        },
      };
    },
    update(values: Record<string, unknown>) {
      return {
        eq(field: string, value: unknown) {
          if (field !== "id") {
            return { data: null, error: { message: "unsupported field" } };
          }
          const key = String(value);
          const existing = state.signals.get(key);
          if (!existing) {
            return { data: null, error: { message: "not found" } };
          }
          const now = isoNow();
          const updated: SignalRow = {
            ...existing,
            ...values,
            status: (values.status as SignalStatus) ?? existing.status,
            updated_at: values.updated_at ? String(values.updated_at) : now,
          };
          state.signals.set(key, updated);
          return { data: [clone(updated)], error: null };
        },
      };
    },
  };
}

function signalDispatchesHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return createQueryBuilder(Array.from(state.signalDispatches.values()));
    },
  };
}

function tradesHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return createQueryBuilder(Array.from(state.trades.values()));
    },
    insert(values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      const inserted: TradeRow[] = [];
      for (const row of rows) {
        const id = String(row.id ?? crypto.randomUUID());
        const now = isoNow();
        const mt5Ticket = row.mt5_ticket_id === undefined
          ? null
          : row.mt5_ticket_id === null
          ? null
          : String(row.mt5_ticket_id);
        const record: TradeRow = {
          id,
          signal_id: row.signal_id === undefined
            ? null
            : row.signal_id === null
            ? null
            : String(row.signal_id),
          account_id: row.account_id === undefined
            ? null
            : row.account_id === null
            ? null
            : String(row.account_id),
          mt5_ticket_id: mt5Ticket,
          status: (row.status as TradeStatus) ?? "pending",
          symbol: row.symbol ? String(row.symbol) : "",
          direction: row.direction ? String(row.direction) : "",
          order_type: String(row.order_type ?? "market"),
          volume: toNumber(row.volume),
          requested_price: toNumber(row.requested_price),
          filled_price: toNumber(row.filled_price),
          stop_loss: toNumber(row.stop_loss),
          take_profit: toNumber(row.take_profit),
          execution_payload: row.execution_payload ?? {},
          error_reason: row.error_reason === undefined
            ? null
            : row.error_reason === null
            ? null
            : String(row.error_reason),
          opened_at: row.opened_at ? String(row.opened_at) : now,
          filled_at: row.filled_at === undefined
            ? null
            : row.filled_at === null
            ? null
            : String(row.filled_at),
          closed_at: row.closed_at === undefined
            ? null
            : row.closed_at === null
            ? null
            : String(row.closed_at),
          created_at: row.created_at ? String(row.created_at) : now,
          updated_at: row.updated_at ? String(row.updated_at) : now,
        };
        state.trades.set(id, record);
        if (mt5Ticket) {
          state.tradeTickets.set(mt5Ticket, id);
        }
        inserted.push(record);
      }
      const data = inserted.map((row) => clone(row));
      return {
        data,
        error: null,
        select() {
          return Promise.resolve({ data, error: null });
        },
      };
    },
    update(values: Record<string, unknown>) {
      return {
        eq(field: string, value: unknown) {
          if (field !== "id") {
            return { data: null, error: { message: "unsupported field" } };
          }
          const key = String(value);
          const existing = state.trades.get(key);
          if (!existing) {
            return { data: null, error: { message: "not found" } };
          }
          const now = isoNow();
          const updated: TradeRow = {
            ...existing,
            ...values,
            status: (values.status as TradeStatus) ?? existing.status,
            mt5_ticket_id: values.mt5_ticket_id === undefined
              ? existing.mt5_ticket_id
              : values.mt5_ticket_id === null
              ? null
              : String(values.mt5_ticket_id),
            updated_at: values.updated_at ? String(values.updated_at) : now,
          };
          state.trades.set(key, updated);
          if (updated.mt5_ticket_id) {
            state.tradeTickets.set(updated.mt5_ticket_id, key);
          }
          return { data: [clone(updated)], error: null };
        },
      };
    },
  };
}

function hedgeActionsHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return createQueryBuilder(Array.from(state.hedgeActions.values()));
    },
    insert(values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      const inserted: HedgeActionRow[] = [];
      for (const row of rows) {
        const id = String(row.id ?? crypto.randomUUID());
        const now = isoNow();
        const record: HedgeActionRow = {
          id,
          symbol: row.symbol ? String(row.symbol) : "",
          hedge_symbol: row.hedge_symbol ? String(row.hedge_symbol) : "",
          side: (row.side as HedgeActionSide) ?? "SHORT_HEDGE",
          qty: Number(row.qty ?? 0) || 0,
          reason: (row.reason as HedgeActionReason) ?? "ATR_SPIKE",
          status: (row.status as HedgeActionStatus) ?? "OPEN",
          entry_price: toNumber(row.entry_price),
          close_price: toNumber(row.close_price),
          pnl: toNumber(row.pnl),
          metadata: typeof row.metadata === "object" && row.metadata !== null
            ? { ...(row.metadata as Record<string, unknown>) }
            : {},
          created_at: row.created_at ? String(row.created_at) : now,
          closed_at: row.closed_at === undefined || row.closed_at === null
            ? null
            : String(row.closed_at),
        };
        state.hedgeActions.set(id, record);
        inserted.push(record);
      }
      const data = inserted.map((row) => clone(row));
      return {
        data,
        error: null,
        select() {
          return {
            async single() {
              return { data: data[0] ?? null, error: null };
            },
            async maybeSingle() {
              return { data: data[0] ?? null, error: null };
            },
            then(
              onfulfilled?: (
                value: {
                  data: HedgeActionRow[];
                  error: { message: string } | null;
                },
              ) => unknown,
              onrejected?: (reason: unknown) => unknown,
            ) {
              return Promise.resolve({ data, error: null }).then(
                onfulfilled,
                onrejected,
              );
            },
          };
        },
      };
    },
    update(values: Record<string, unknown>) {
      return {
        eq(field: string, value: unknown) {
          if (field !== "id") {
            return { data: null, error: { message: "unsupported field" } };
          }
          const key = String(value);
          const existing = state.hedgeActions.get(key);
          if (!existing) {
            return { data: null, error: { message: "not found" } };
          }
          const now = isoNow();
          const updated: HedgeActionRow = {
            ...existing,
            ...values,
            side: (values.side as HedgeActionSide) ?? existing.side,
            reason: (values.reason as HedgeActionReason) ?? existing.reason,
            status: (values.status as HedgeActionStatus) ?? existing.status,
            qty: values.qty === undefined
              ? existing.qty
              : Number(values.qty) || 0,
            entry_price: values.entry_price === undefined
              ? existing.entry_price
              : toNumber(values.entry_price),
            close_price: values.close_price === undefined
              ? existing.close_price
              : toNumber(values.close_price),
            pnl: values.pnl === undefined ? existing.pnl : toNumber(values.pnl),
            metadata: values.metadata && typeof values.metadata === "object"
              ? { ...(values.metadata as Record<string, unknown>) }
              : existing.metadata,
            closed_at:
              values.closed_at === undefined || values.closed_at === null
                ? existing.closed_at
                : String(values.closed_at),
            created_at: existing.created_at,
          };
          if (updated.status === "CLOSED" && !updated.closed_at) {
            updated.closed_at = now;
          }
          state.hedgeActions.set(key, updated);
          const data = [clone(updated)];
          return {
            data,
            error: null,
            select() {
              return {
                async single() {
                  return { data: data[0] ?? null, error: null };
                },
                async maybeSingle() {
                  return { data: data[0] ?? null, error: null };
                },
                then(
                  onfulfilled?: (
                    value: {
                      data: HedgeActionRow[];
                      error: { message: string } | null;
                    },
                  ) => unknown,
                  onrejected?: (reason: unknown) => unknown,
                ) {
                  return Promise.resolve({ data, error: null }).then(
                    onfulfilled,
                    onrejected,
                  );
                },
              };
            },
          };
        },
      };
    },
  };
}

function handleClaimTradingSignal(
  state: StubState,
  params: Record<string, unknown>,
) {
  const workerIdRaw = params.p_worker_id ?? params.worker_id;
  const workerId = workerIdRaw === undefined || workerIdRaw === null
    ? ""
    : String(workerIdRaw).trim();
  if (!workerId) {
    throw new Error("worker_id is required");
  }

  const accountCodeRaw = params.p_account_code ?? params.account_code;
  let accountId: string | null = null;
  if (accountCodeRaw !== undefined && accountCodeRaw !== null) {
    const code = String(accountCodeRaw);
    for (const account of state.tradingAccounts.values()) {
      if (account.account_code === code) {
        accountId = account.id;
        break;
      }
    }
    if (accountId === null) {
      return null;
    }
  }

  const candidates = Array.from(state.signals.values()).filter((signal) => {
    if (signal.status !== "pending") return false;
    if (accountId === null) return true;
    return signal.account_id === accountId;
  });

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const poll = a.next_poll_at.localeCompare(b.next_poll_at);
    if (poll !== 0) return poll;
    return a.created_at.localeCompare(b.created_at);
  });

  const candidate = candidates[0];
  if (!candidate) return null;

  const now = isoNow();
  candidate.status = "claimed";
  candidate.acknowledged_at = now;
  candidate.last_heartbeat_at = now;
  candidate.updated_at = now;

  const retry = Math.max(
    -1,
    ...Array.from(state.signalDispatches.values())
      .filter((dispatch) => dispatch.signal_id === candidate.id)
      .map((dispatch) => dispatch.retry_count),
  ) + 1;

  const dispatch: SignalDispatchRow = {
    id: crypto.randomUUID(),
    signal_id: candidate.id,
    worker_id: workerId,
    status: "claimed",
    retry_count: retry,
    metadata: {},
    claimed_at: now,
    last_heartbeat_at: now,
    completed_at: null,
    failed_at: null,
    created_at: now,
    updated_at: now,
  };
  state.signalDispatches.set(dispatch.id, dispatch);

  return clone(candidate);
}

function handleMarkTradingSignalStatus(
  state: StubState,
  params: Record<string, unknown>,
) {
  const signalIdRaw = params.p_signal_id ?? params.signal_id;
  if (signalIdRaw === undefined || signalIdRaw === null) {
    throw new Error("p_signal_id is required");
  }
  const statusRaw = params.p_status ?? params.status;
  if (statusRaw === undefined || statusRaw === null) {
    throw new Error("p_status is required");
  }
  const status = statusRaw as SignalStatus;
  const signalId = String(signalIdRaw);
  const signal = state.signals.get(signalId);
  if (!signal) {
    throw new Error(`signal ${signalId} not found`);
  }

  const now = isoNow();
  signal.status = status;
  if ("p_error" in params) {
    const error = params.p_error;
    signal.error_reason = error === undefined || error === null
      ? null
      : String(error);
  }
  if (params.p_next_poll_at !== undefined && params.p_next_poll_at !== null) {
    signal.next_poll_at = String(params.p_next_poll_at);
  }
  const workerIdParam = params.p_worker_id ?? params.worker_id;
  if (workerIdParam !== undefined && workerIdParam !== null) {
    signal.last_heartbeat_at = now;
  }
  if (status === "executed" && !signal.executed_at) {
    signal.executed_at = now;
  }
  if (status === "cancelled" && !signal.cancelled_at) {
    signal.cancelled_at = now;
  }
  signal.updated_at = now;

  const dispatchStatus = params.p_dispatch_status ?? params.dispatch_status;
  if (workerIdParam !== undefined && workerIdParam !== null) {
    const workerId = String(workerIdParam);
    const dispatches = Array.from(state.signalDispatches.values())
      .filter((row) => row.signal_id === signalId && row.worker_id === workerId)
      .sort((a, b) => b.claimed_at.localeCompare(a.claimed_at));
    const dispatch = dispatches[0];
    if (dispatch) {
      if (dispatchStatus !== undefined && dispatchStatus !== null) {
        dispatch.status = dispatchStatus as SignalDispatchStatus;
      }
      dispatch.last_heartbeat_at = now;
      if (dispatch.status === "completed" && !dispatch.completed_at) {
        dispatch.completed_at = now;
      }
      if (dispatch.status === "failed" && !dispatch.failed_at) {
        dispatch.failed_at = now;
      }
      dispatch.updated_at = now;
    }
  }

  return clone(signal);
}

function handleRecordTradeUpdate(
  state: StubState,
  params: Record<string, unknown>,
) {
  const signalIdRaw = params.p_signal_id ?? params.signal_id;
  if (signalIdRaw === undefined || signalIdRaw === null) {
    throw new Error("p_signal_id is required");
  }
  const signalId = String(signalIdRaw);
  const signal = state.signals.get(signalId);
  if (!signal) {
    throw new Error(`signal ${signalId} not found`);
  }

  const statusParam = params.p_status ?? params.status;
  const status = (statusParam as TradeStatus) ?? "pending";
  const payload = (params.p_payload ?? params.payload ?? {}) as Record<
    string,
    unknown
  >;
  const ticketParam = params.p_mt5_ticket_id ?? params.mt5_ticket_id;
  const ticket = ticketParam === undefined || ticketParam === null
    ? null
    : String(ticketParam);
  const now = isoNow();

  let tradeId = ticket ? state.tradeTickets.get(ticket) : undefined;
  let record: TradeRow | undefined = tradeId
    ? state.trades.get(tradeId)
    : undefined;
  if (!record) {
    tradeId = crypto.randomUUID();
    record = {
      id: tradeId,
      signal_id: signal.id,
      account_id: signal.account_id,
      mt5_ticket_id: ticket,
      status,
      symbol: signal.symbol,
      direction: signal.direction,
      order_type: signal.order_type,
      volume: null,
      requested_price: null,
      filled_price: null,
      stop_loss: null,
      take_profit: null,
      execution_payload: payload,
      error_reason: null,
      opened_at: payload.opened_at ? String(payload.opened_at) : now,
      filled_at: payload.filled_at ? String(payload.filled_at) : null,
      closed_at: payload.closed_at ? String(payload.closed_at) : null,
      created_at: now,
      updated_at: now,
    };
  }

  record.signal_id = signal.id;
  record.account_id = signal.account_id;
  record.mt5_ticket_id = ticket;
  record.status = status;
  record.symbol = signal.symbol;
  record.direction = signal.direction;
  record.order_type = signal.order_type;
  record.volume = toNumber(payload.volume);
  record.requested_price = toNumber(payload.requested_price);
  record.filled_price = toNumber(payload.filled_price);
  record.stop_loss = toNumber(payload.stop_loss);
  record.take_profit = toNumber(payload.take_profit);
  record.execution_payload = payload ?? {};
  record.error_reason =
    payload.error_reason === undefined || payload.error_reason === null
      ? null
      : String(payload.error_reason);
  if (payload.opened_at !== undefined && payload.opened_at !== null) {
    record.opened_at = String(payload.opened_at);
  }
  if (payload.filled_at !== undefined && payload.filled_at !== null) {
    record.filled_at = String(payload.filled_at);
  }
  if (payload.closed_at !== undefined && payload.closed_at !== null) {
    record.closed_at = String(payload.closed_at);
  }
  record.updated_at = now;
  if (!record.created_at) {
    record.created_at = now;
  }

  const finalId = record.id ?? tradeId ?? crypto.randomUUID();
  record.id = finalId;
  state.trades.set(finalId, record);
  if (ticket) {
    state.tradeTickets.set(ticket, finalId);
  }

  return clone(record);
}

class SupabaseStub {
  constructor(
    private readonly state: StubState,
    private readonly role: "anon" | "service" = "anon",
  ) {}

  from(table: string) {
    switch (table) {
      case "payments":
        return paymentsHandlers(this.state);
      case "user_subscriptions":
        return userSubscriptionsHandlers(this.state);
      case "receipts":
        return receiptsHandlers(this.state);
      case "trading_accounts":
        return tradingAccountsHandlers(this.state);
      case "signals":
        return signalsHandlers(this.state);
      case "signal_dispatches":
        return signalDispatchesHandlers(this.state);
      case "trades":
        return tradesHandlers(this.state);
      case "hedge_actions":
        return hedgeActionsHandlers(this.state);
      default:
        return {
          select() {
            return createQueryBuilder([] as Record<string, unknown>[]);
          },
          insert(values?: Record<string, unknown> | Record<string, unknown>[]) {
            const rows = Array.isArray(values)
              ? values
              : values
              ? [values]
              : [];
            const data = rows.map((row) => clone(row));
            return {
              data,
              error: null,
              select() {
                return Promise.resolve({ data, error: null });
              },
            };
          },
          update() {
            return {
              eq() {
                return { data: [], error: null };
              },
            };
          },
        };
    }
  }

  rpc(name: string, params: Record<string, unknown> = {}) {
    try {
      switch (name) {
        case "claim_trading_signal":
          return Promise.resolve({
            data: handleClaimTradingSignal(this.state, params),
            error: null,
          });
        case "mark_trading_signal_status":
          return Promise.resolve({
            data: handleMarkTradingSignalStatus(this.state, params),
            error: null,
          });
        case "record_trade_update":
          return Promise.resolve({
            data: handleRecordTradeUpdate(this.state, params),
            error: null,
          });
        default:
          return Promise.resolve({
            data: null,
            error: { message: `rpc not implemented: ${name}` },
          });
      }
    } catch (error) {
      return Promise.resolve({
        data: null,
        error: { message: (error as Error).message },
      });
    }
  }

  storage = {
    from: (_bucket: string) => {
      const state = this.state;
      return {
        async createSignedUploadUrl(key: string) {
          return {
            data: {
              signedUrl:
                `http://example.com/storage/v1/object/upload/sign/${key}?token=token`,
            },
            error: null,
          };
        },
        async download(path: string) {
          const blob = state.storageFiles.get(path) ?? null;
          if (!blob) {
            return { data: null, error: { message: "not found" } };
          }
          return { data: blob, error: null };
        },
        async remove(paths: string[]) {
          for (const p of paths) state.storageFiles.delete(p);
          return { data: null, error: null };
        },
        async upload(path: string, blob: Blob) {
          state.storageFiles.set(path, blob);
          return { data: { path }, error: null };
        },
      };
    },
  };

  auth = {
    async getUser() {
      return {
        data: {
          user: { id: "stub-user", user_metadata: { telegram_id: "stub" } },
        },
        error: null,
      };
    },
    async signJWT(
      _payload: Record<string, unknown>,
      _opts: Record<string, unknown>,
    ) {
      return { access_token: "token" };
    },
  };
}

export interface RequestClientOptions {
  role?: "anon" | "service";
  requireAuthorization?: boolean;
  [key: string]: unknown;
}

interface RequestLike {
  headers: {
    get(name: string): string | null | undefined;
  };
}

export function createClientForRequest(
  req: RequestLike,
  options?: RequestClientOptions,
) {
  const role = options?.role ?? "anon";
  const requireAuthorization = options?.requireAuthorization ?? false;

  const authHeader = req.headers?.get?.("Authorization")?.trim() ?? "";

  if (requireAuthorization && authHeader.length === 0) {
    throw new Error("Missing Authorization header for createClientForRequest");
  }

  return createClient(role as "anon" | "service");
}

export function createClient(role: "anon" | "service" = "anon") {
  return new SupabaseStub(stubState, role) as unknown as {
    [key: string]: unknown;
  };
}

export type SupabaseClient = ReturnType<typeof createClient>;

export function createSupabaseClient(..._args: unknown[]) {
  return createClient();
}
