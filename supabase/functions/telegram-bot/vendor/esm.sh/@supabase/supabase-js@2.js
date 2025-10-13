export class SupabaseClient {}

export function createClient(urlArg, keyArg, _options) {
  const state = globalThis.__SUPA_MOCK__ || { tables: {} };
  const config = { url: urlArg, key: keyArg };
  const isMockKey = typeof keyArg === "string" && keyArg.length < 40;
  return {
    from(table) {
      const rows = state.tables[table] || (state.tables[table] = []);
      let col = null;
      let val = null;
      let op = null;
      let payload = null;
      let lastInsert = null;
      let selectQuery = "";
      /** @type {(() => Promise<void>) | null} */
      let pendingRequest = null;
      /** @type {Array<[string, string]>} */
      const filterParams = [];
      /** @type {string[]} */
      const orderParams = [];
      /** @type {string | null} */
      let limitParam = null;
      const performRequest = async (method, body, preferParts) => {
        const baseUrl = isMockKey ? "https://stub.supabase.co" : config.url;
        const url = new URL(`${baseUrl}/rest/v1/${table}`);
        const selection = selectQuery?.trim();
        if (selection) {
          url.searchParams.set("select", selection);
        }
        if (limitParam) {
          url.searchParams.set("limit", limitParam);
        }
        for (const param of orderParams) {
          url.searchParams.append("order", param);
        }
        for (const [key, value] of filterParams) {
          url.searchParams.append(key, value);
        }
        const headers = {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          Accept: "application/json",
        };
        if (method !== "GET") {
          headers["Content-Type"] = "application/json";
        }
        if (preferParts && preferParts.length > 0) {
          headers.Prefer = preferParts.join(",");
        }
        let response;
        let payloadResponse = null;
        try {
          response = await fetch(url.toString(), {
            method,
            headers,
            ...(method !== "GET" && body !== undefined
              ? { body: JSON.stringify(body) }
              : {}),
          });
          try {
            payloadResponse = await response.json();
          } catch {
            payloadResponse = null;
          }
          if (!response.ok) {
            api.error = {
              message: payloadResponse?.message ??
                `http_error_${response.status}`,
            };
            api.data = null;
            return;
          }
          api.error = null;
          api.data = payloadResponse;
          if (Array.isArray(payloadResponse)) {
            lastInsert = payloadResponse[payloadResponse.length - 1] ??
              payloadResponse[0] ?? null;
          } else {
            lastInsert = payloadResponse;
          }
        } catch (error) {
          api.error = {
            message: error instanceof Error
              ? error.message
              : String(error),
          };
          api.data = null;
        }
      };
      /** @type {any} */
      const api = {
        error: null,
        data: null,
        select(selection) {
          if (typeof selection === "string" && selection.trim()) {
            selectQuery = selection
              .split(",")
              .map((part) => part.trim())
              .join(",");
          } else {
            selectQuery = "*";
          }
          if (!pendingRequest) {
            pendingRequest = async () => {
              await performRequest("GET");
            };
          }
          return api;
        },
        insert(vals, _opts) {
          op = "insert";
          const arr = Array.isArray(vals) ? vals : [vals];
          arr.forEach((v) => rows.push(v));
          lastInsert = arr[0];
          pendingRequest = null;
          return api;
        },
        update(vals, _opts) {
          op = "update";
          payload = vals;
          return api;
        },
        upsert(vals, opts) {
          op = "upsert";
          const arr = Array.isArray(vals) ? vals : [vals];
          /** @type {unknown[]} */
          const results = [];
          arr.forEach((v) => {
            const idx = rows.findIndex((r) =>
              String(r.telegram_user_id) === String(v.telegram_user_id)
            );
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...v };
              lastInsert = rows[idx];
            } else {
              rows.push(v);
              lastInsert = v;
            }
            results.push(lastInsert);
          });
          api.data = results;
          api.error = null;
          if (config.url && config.key && config.key !== "stub-anon-key") {
            pendingRequest = async () => {
              const prefer = [];
              if (opts?.onConflict) {
                prefer.push("resolution=merge-duplicates");
              }
              if (opts?.ignoreDuplicates) {
                prefer.push("resolution=ignore-duplicates");
              }
              const returning = opts?.returning ?? "representation";
              if (returning) {
                prefer.push(`return=${returning}`);
              }
              const payloadBody = arr.length === 1 ? arr[0] : arr;
              if (opts?.onConflict) {
                filterParams.push(["on_conflict", String(opts.onConflict)]);
              }
              await performRequest("POST", payloadBody, prefer);
            };
          } else {
            pendingRequest = null;
          }
          return api;
        },
        delete(..._args) {
          op = "delete";
          return api;
        },
        eq(c, v) {
          col = c;
          val = v;
          filterParams.push([String(c), `eq.${v}`]);
          return api;
        },
        like(..._args) {
          return api;
        },
        not(..._args) {
          const [field, operator, value] = _args;
          const valStr = value === null || value === undefined
            ? "null"
            : String(value);
          filterParams.push([
            String(field),
            `not.${String(operator)}.${valStr}`,
          ]);
          return api;
        },
        gt(c, v) {
          filterParams.push([String(c), `gt.${v}`]);
          return api;
        },
        gte(c, v) {
          filterParams.push([String(c), `gte.${v}`]);
          return api;
        },
        lt(c, v) {
          filterParams.push([String(c), `lt.${v}`]);
          return api;
        },
        lte(c, v) {
          filterParams.push([String(c), `lte.${v}`]);
          return api;
        },
        or(expression) {
          filterParams.push(["or", String(expression)]);
          return api;
        },
        order(column, options) {
          const ascending = options?.ascending === false ? "desc" : "asc";
          orderParams.push(`${column}.${ascending}`);
          return api;
        },
        limit(count) {
          limitParam = String(count);
          return api;
        },
        in(column, values) {
          const list = Array.isArray(values) ? values.join(",") : String(values);
          filterParams.push([String(column), `in.(${list})`]);
          return api;
        },
        single: async () => {
          if (pendingRequest) {
            await pendingRequest();
            pendingRequest = null;
            const resolved = Array.isArray(api.data)
              ? api.data[0] ?? null
              : api.data ?? null;
            return { data: resolved, error: api.error };
          }
          if (op === "insert" || op === "upsert") {
            return { data: lastInsert ?? null, error: null };
          }
          if (op === "update") {
            const r = rows.find((r) =>
              col ? String(r[col]) === String(val) : true
            );
            if (r) Object.assign(r, payload);
            return { data: r || null, error: null };
          }
          if (op === "delete") {
            const idx = rows.findIndex((r) =>
              col ? String(r[col]) === String(val) : false
            );
            const r = idx >= 0 ? rows.splice(idx, 1)[0] : null;
            return { data: r, error: null };
          }
          const r = rows.find((r) =>
            col ? String(r[col]) === String(val) : true
          );
          return { data: r, error: null };
        },
        maybeSingle: async () => {
          const res = await api.single();
          return { data: res.data ?? null, error: res.error };
        },
        then(onFulfilled, onRejected) {
          const exec = async () => {
            if (pendingRequest) {
              await pendingRequest();
              pendingRequest = null;
            }
            return { data: api.data ?? null, error: api.error ?? null };
          };
          return exec().then(onFulfilled, onRejected);
        },
      };
      return api;
    },
    storage: {
      from(_bucket) {
        return {
          upload: async (..._args) => ({ data: null, error: null }),
          createSignedUrl: async (..._args) => ({
            data: { signedUrl: "https://example/signed" },
            error: null,
          }),
          download: async (key) => {
            try {
              const data = await Deno.readFile(
                `supabase/functions/miniapp/static/${key}`,
              );
              return { data: new Blob([data]), error: null };
            } catch {
              return { data: null, error: { message: "not found" } };
            }
          },
        };
      },
    },
    auth: {
      async getUser() {
        return {
          data: { user: { id: "", user_metadata: { telegram_id: "" } } },
          error: null,
        };
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
