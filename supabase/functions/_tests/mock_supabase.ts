export interface MockMembershipRecord {
  telegram_user_id: string;
  channel_id: string;
  is_active: boolean;
}

export interface MockBotUser {
  telegram_id: string;
  is_vip?: boolean;
}

interface Filter {
  field: keyof MockMembershipRecord;
  val: unknown;
}

interface ChannelMembershipSelect {
  _filters: Filter[];
  eq(this: ChannelMembershipSelect, field: keyof MockMembershipRecord, val: unknown): ChannelMembershipSelect;
  limit(this: ChannelMembershipSelect): ChannelMembershipSelect;
  maybeSingle(this: ChannelMembershipSelect): Promise<{ data: MockMembershipRecord | null; error: null }>;
}

interface ChannelMembershipTable {
  upsert(rows: MockMembershipRecord[] | MockMembershipRecord): Promise<{ data: null; error: null }>;
  select(): ChannelMembershipSelect;
}

interface UserSubscriptionsSelect {
  eq(field: string, val: unknown): UserSubscriptionsSelect;
  maybeSingle(): Promise<{ data: null; error: null }>;
}

interface UserSubscriptionsTable {
  select(): UserSubscriptionsSelect;
}

interface BotUsersSelect {
  order(): BotUsersSelect;
  limit(lim: number): { data: MockBotUser[]; error: null };
  range(start: number, end: number): { data: MockBotUser[]; error: null };
}

interface BotUsersTable {
  select(): BotUsersSelect;
  update(vals: Partial<MockBotUser>): {
    eq(field: string, val: string): { data: null; error: null };
  };
  upsert(row: MockBotUser): Promise<{ data: null; error: null }>;
}

interface AdminLogsTable {
  insert(row: unknown): Promise<{ data: unknown; error: null }>;
}

export interface MockSupabaseClient {
  channel_memberships: Record<string, MockMembershipRecord>;
  bot_users: Record<string, MockBotUser>;
  admin_logs: unknown[];
  storage: {
    from(_bucket: string): {
      upload: (..._args: any[]) => Promise<{ data: null; error: null }>;
      createSignedUrl: (..._args: any[]) => Promise<{ data: { signedUrl: string }; error: null }>;
      download: (
        _key: any,
      ) => Promise<{ data: Blob; error: null } | { data: null; error: { message: string } }>;
    };
  };
  rpc(
    name: string,
    params: unknown,
  ): Promise<
    | { data: { count: number }; error: null }
    | { data: null; error: { message: string } }
    | { data: null; error: null }
  >;
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; user_metadata: { telegram_id: string } } }; error: null }>;
    signJWT: (
      payload: Record<string, unknown>,
      opts: Record<string, unknown>,
    ) => Promise<{ access_token: string }>;
  };
  from(table: "channel_memberships"): ChannelMembershipTable;
  from(table: "user_subscriptions"): UserSubscriptionsTable;
  from(table: "bot_users"): BotUsersTable;
  from(table: "admin_logs"): AdminLogsTable;
  from(table: string): unknown;
}

export function createMockSupabaseClient(): MockSupabaseClient {
  const cm: Record<string, MockMembershipRecord> = {};
  const users: Record<string, MockBotUser> = {};
  const logs: unknown[] = [];

  const client = {
    channel_memberships: cm,
    bot_users: users,
    admin_logs: logs,
    storage: {
      from(_bucket: string) {
        return {
          upload: async (..._args: any[]) => ({ data: null, error: null }),
          createSignedUrl: async (..._args: any[]) => ({
            data: { signedUrl: "http://example.com" },
            error: null,
          }),
          download: async (_key: any) => ({
            data: null,
            error: { message: "not found" },
          }),
        };
      },
    },
    rpc: async (name: string, _params: unknown) => {
  await Promise.resolve(); // satisfy require-await

      if (name === "rl_touch") {
        return { data: { count: 0 }, error: null };
      }
      return { data: null, error: null };
    },
    auth: {
      async getUser() {
        return {
          data: { user: { id: "", user_metadata: { telegram_id: "" } } },
          error: null,
        };
      },
      async signJWT(_payload: Record<string, unknown>, _opts: Record<string, unknown>) {
        return { access_token: "token" };
      },
    },
    from(table: string) {
      if (table === "channel_memberships") {
        return {
          upsert: async (rows: MockMembershipRecord[] | MockMembershipRecord) => {
  await Promise.resolve(); // satisfy require-await

            for (const r of Array.isArray(rows) ? rows : [rows]) {
              cm[`${r.telegram_user_id}:${r.channel_id}`] = r;
            }
            return { data: null, error: null };
          },
          select: () => ({
            _filters: [] as Filter[],
            eq(this: ChannelMembershipSelect, field: keyof MockMembershipRecord, val: unknown) {
              this._filters.push({ field, val });
              return this;
            },
            limit(this: ChannelMembershipSelect) { return this; },
            async maybeSingle(this: ChannelMembershipSelect) {
              const found = Object.values(cm).find((r) =>
                this._filters.every((f) => r[f.field] === f.val)
              );
              return { data: found ?? null, error: null };
            },
          }),
        };
      }
      if (table === "user_subscriptions") {
        return {
          select: () => ({
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          }),
        };
      }
      if (table === "bot_users") {
        return {
          select: () => ({
            order() { return this; },
            limit(lim: number) {
              return { data: Object.values(users).slice(0, lim), error: null };
            },
            range(start: number, end: number) {
              return { data: Object.values(users).slice(start, end + 1), error: null };
            },
          }),
          update: (vals: Partial<MockBotUser>) => ({
            eq(_field: string, val: string) {
              const u = users[val] || { telegram_id: val };
              users[val] = { ...u, ...vals };
              return { data: null, error: null };
            },
          }),
          upsert: (row: MockBotUser) => {
            users[row.telegram_id] = row;
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      if (table === "admin_logs") {
        return {
          insert: async (row: unknown) => {
  await Promise.resolve(); // satisfy require-await

            logs.push(row);
            return { data: row, error: null };
          },
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  };

  return client as unknown as MockSupabaseClient;
}

