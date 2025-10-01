interface PaymentRow extends Record<string, unknown> {
  amount?: string | number | null;
  status?: string | null;
  created_at?: string | null;
  plan_id?: string | null;
  currency?: string | null;
}

interface SubscriptionRow extends Record<string, unknown> {
  plan_id?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
}

interface PlanRow extends Record<string, unknown> {
  id?: string | null;
  name?: string | null;
  price?: number | string | null;
  currency?: string | null;
}

interface CountableRow extends Record<string, unknown> {
  created_at?: string | null;
}

interface SelectOptions {
  count?: "exact";
  head?: boolean;
}

interface QueryResult<T> {
  data: T[];
  error: { message: string } | null;
  count?: number;
}

interface AnalyticsDataStubState {
  payments: PaymentRow[];
  userSubscriptions: SubscriptionRow[];
  subscriptionPlans: PlanRow[];
  botUsers: CountableRow[];
  currentVip: CountableRow[];
}

const state: AnalyticsDataStubState = {
  payments: [],
  userSubscriptions: [],
  subscriptionPlans: [],
  botUsers: [],
  currentVip: [],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function toComparable(
  value: unknown,
): { kind: "number" | "string"; value: number | string } | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return { kind: "number", value };
  }
  if (typeof value === "string") {
    return { kind: "string", value };
  }
  if (value instanceof Date) {
    return { kind: "string", value: value.toISOString() };
  }
  return { kind: "string", value: String(value) };
}

function compareValues(left: unknown, right: unknown): number | null {
  const a = toComparable(left);
  const b = toComparable(right);
  if (!a || !b) return null;
  if (a.kind === "number" && b.kind === "number") {
    return a.value - b.value;
  }
  const as = String(a.value);
  const bs = String(b.value);
  return as.localeCompare(bs);
}

class QueryBuilder<T extends Record<string, unknown>> {
  private readonly filters: ((row: T) => boolean)[] = [];

  constructor(
    private readonly rows: T[],
    private readonly options: SelectOptions = {},
  ) {}

  eq(field: string, value: unknown): QueryBuilder<T> {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  gte(field: string, value: unknown): QueryBuilder<T> {
    this.filters.push((row) => {
      const cmp = compareValues(row[field], value);
      return cmp !== null && cmp >= 0;
    });
    return this;
  }

  lte(field: string, value: unknown): QueryBuilder<T> {
    this.filters.push((row) => {
      const cmp = compareValues(row[field], value);
      return cmp !== null && cmp <= 0;
    });
    return this;
  }

  private applyFilters(): T[] {
    return this.rows.filter((row) => this.filters.every((fn) => fn(row)));
  }

  private buildResult(): QueryResult<T> {
    const filtered = this.applyFilters().map((row) => clone(row));
    const payload: QueryResult<T> = {
      data: this.options.head ? [] : filtered,
      error: null,
    };
    if (this.options.count === "exact") {
      payload.count = filtered.length;
    }
    return payload;
  }

  async maybeSingle(): Promise<
    { data: T | null; error: { message: string } | null }
  > {
    const filtered = this.applyFilters().map((row) => clone(row));
    return { data: filtered[0] ?? null, error: null };
  }

  async single(): Promise<
    { data: T | null; error: { message: string } | null }
  > {
    const filtered = this.applyFilters().map((row) => clone(row));
    if (filtered.length === 1) {
      return { data: filtered[0], error: null };
    }
    if (filtered.length === 0) {
      return { data: null, error: { message: "no rows" } };
    }
    return { data: null, error: { message: "multiple rows" } };
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const promise = Promise.resolve(this.buildResult());
    return promise.then(
      onfulfilled ?? ((value) => value as unknown as TResult1),
      onrejected ?? undefined,
    );
  }
}

function createTableHandler<T extends Record<string, unknown>>(
  getRows: () => T[],
) {
  return {
    select(_columns?: string, options?: SelectOptions) {
      const rows = getRows().map((row) => clone(row));
      return new QueryBuilder(rows, options);
    },
  };
}

class AnalyticsDataSupabaseClient {
  from(table: string) {
    switch (table) {
      case "payments":
        return createTableHandler(() => state.payments);
      case "user_subscriptions":
        return createTableHandler(() => state.userSubscriptions);
      case "subscription_plans":
        return createTableHandler(() => state.subscriptionPlans);
      case "bot_users":
        return createTableHandler(() => state.botUsers);
      case "current_vip":
        return createTableHandler(() => state.currentVip);
      default:
        return createTableHandler(() => []);
    }
  }
}

export function createClient(): AnalyticsDataSupabaseClient {
  return new AnalyticsDataSupabaseClient();
}

export function __resetAnalyticsDataStubState() {
  state.payments = [];
  state.userSubscriptions = [];
  state.subscriptionPlans = [];
  state.botUsers = [];
  state.currentVip = [];
}

export function __setAnalyticsDataStubState(
  partial: Partial<AnalyticsDataStubState>,
) {
  if (partial.payments) {
    state.payments = partial.payments.map((row) => clone(row));
  }
  if (partial.userSubscriptions) {
    state.userSubscriptions = partial.userSubscriptions.map((row) =>
      clone(row)
    );
  }
  if (partial.subscriptionPlans) {
    state.subscriptionPlans = partial.subscriptionPlans.map((row) =>
      clone(row)
    );
  }
  if (partial.botUsers) {
    state.botUsers = partial.botUsers.map((row) => clone(row));
  }
  if (partial.currentVip) {
    state.currentVip = partial.currentVip.map((row) => clone(row));
  }
}

export type { AnalyticsDataStubState };
