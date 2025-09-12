export function createClient() {
  const state = globalThis.__SUPA_MOCK__ || { tables: {} };
  return {
    from(table) {
      const rows = state.tables[table] || [];
      let col = null;
      let val = null;
      let op = null;
      let payload = null;
      let lastInsert = null;
      const api = {
        select() {
          return api;
        },
        insert(vals) {
          op = "insert";
          const arr = Array.isArray(vals) ? vals : [vals];
          arr.forEach((v) => rows.push(v));
          lastInsert = arr[0];
          return api;
        },
        update(vals) {
          op = "update";
          payload = vals;
          return api;
        },
        upsert(vals) {
          const arr = Array.isArray(vals) ? vals : [vals];
          arr.forEach((v) => {
            const idx = rows.findIndex((r) =>
              String(r.telegram_user_id) === String(v.telegram_user_id)
            );
            if (idx >= 0) rows[idx] = { ...rows[idx], ...v };
            else rows.push(v);
          });
          return Promise.resolve({ data: arr, error: null });
        },
        eq(c, v) {
          col = c;
          val = v;
          if (op === "update") {
            const r = rows.find((r) => String(r[col]) === String(val));
            if (r) Object.assign(r, payload);
            return Promise.resolve({ data: r ? [r] : [], error: null });
          }
          return api;
        },
        single: async () => {
          if (op === "insert") return { data: lastInsert, error: null };
          const r = rows.find((r) =>
            col ? String(r[col]) === String(val) : true
          );
          return { data: r, error: null };
        },
        maybeSingle: async () => {
          const r = rows.find((r) =>
            col ? String(r[col]) === String(val) : true
          );
          return { data: r || null, error: null };
        },
      };
      return api;
    },
    auth: {
      async getUser() {
        return { data: { user: { id: "", user_metadata: { telegram_id: "" } } }, error: null };
      },
      async signJWT(_payload, _opts) {
        return { access_token: "token" };
      },
    },
    rpc(name, params) {
      if (name === "rl_touch") {
        const rl = state.rl || (state.rl = {});
        const now = Date.now();
        const rec = rl[params._tg] || { count: 0, ts: now };
        if (now - rec.ts > 60_000) {
          rec.count = 0;
          rec.ts = now;
        }
        rec.count++;
        rl[params._tg] = rec;
        if (rec.count > params._limit) {
          return Promise.resolve({
            data: null,
            error: { message: "rate_limited" },
          });
        }
        return Promise.resolve({ data: { count: rec.count }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}
