interface StubState {
  payments: Map<string, Record<string, unknown>>;
  userSubscriptions: Map<string, Record<string, unknown>>;
  receiptsByHash: Map<string, Record<string, unknown>>;
  storageFiles: Map<string, Blob>;
}

const stubState: StubState = {
  payments: new Map(),
  userSubscriptions: new Map(),
  receiptsByHash: new Map(),
  storageFiles: new Map(),
};

export const __testSupabaseState = stubState;

export function __resetSupabaseState() {
  stubState.payments.clear();
  stubState.userSubscriptions.clear();
  stubState.receiptsByHash.clear();
  stubState.storageFiles.clear();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function paymentsHandlers(state: StubState) {
  return {
    select(_columns?: string) {
      return {
        eq(field: string, value: unknown) {
          const key = String(value);
          const row = field === "id"
            ? state.payments.get(key) ?? null
            : null;
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

class SupabaseStub {
  constructor(private readonly state: StubState) {}

  from(table: string) {
    switch (table) {
      case "payments":
        return paymentsHandlers(this.state);
      case "user_subscriptions":
        return userSubscriptionsHandlers(this.state);
      case "receipts":
        return receiptsHandlers(this.state);
      default:
        return {
          select() {
            return {
              async maybeSingle() {
                return { data: null, error: null };
              },
            };
          },
        };
    }
  }

  storage = {
    from: (_bucket: string) => {
      const state = this.state;
      return {
        async createSignedUploadUrl(key: string) {
          return {
            data: {
              signedUrl: `http://example.com/storage/v1/object/upload/sign/${key}?token=token`,
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
        data: { user: { id: "stub-user", user_metadata: { telegram_id: "stub" } } },
        error: null,
      };
    },
    async signJWT(_payload: Record<string, unknown>, _opts: Record<string, unknown>) {
      return { access_token: "token" };
    },
  };
}

export function createClient() {
  return new SupabaseStub(stubState) as unknown as { [key: string]: unknown };
}

export type SupabaseClient = ReturnType<typeof createClient>;

export function createSupabaseClient(..._args: unknown[]) {
  return createClient();
}
