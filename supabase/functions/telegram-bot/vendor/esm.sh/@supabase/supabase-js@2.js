const DEFAULT_URL = "https://stub.supabase.co";

function cloneRow(row) {
  return JSON.parse(JSON.stringify(row));
}

function coerceComparable(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsedDate = Date.parse(trimmed);
    if (!Number.isNaN(parsedDate)) return parsedDate;
    const parsedNumber = Number(trimmed);
    if (!Number.isNaN(parsedNumber)) return parsedNumber;
    return trimmed.toLowerCase();
  }
  if (typeof value === "bigint") return Number(value);
  return String(value);
}

function compareValues(left, right) {
  if (left === right) return 0;
  const a = coerceComparable(left);
  const b = coerceComparable(right);
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
  if (typeof a === "string" && typeof b === "string") {
    const cmp = a.localeCompare(b);
    if (cmp !== 0) return cmp;
    return 0;
  }
  if (typeof a === typeof b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
  const aStr = String(a);
  const bStr = String(b);
  const cmp = aStr.localeCompare(bStr);
  if (cmp !== 0) return cmp;
  return 0;
}

function equals(left, right) {
  if (left === null || left === undefined) {
    return right === null || right === undefined || right === "null";
  }
  if (right === null || right === undefined) {
    return left === null || left === undefined;
  }
  if (typeof left === "number" && typeof right === "number") {
    return Object.is(left, right);
  }
  return String(left) === String(right);
}

function toRegExp(pattern, flags = "") {
  const escaped = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const normalized = escaped.replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${normalized}$`, flags);
}

function parseOrExpression(expression) {
  const trimmed = expression.trim().replace(/^\(|\)$/g, "");
  if (!trimmed) return [];
  return trimmed.split(/,(?![^()]*\))/).map((part) => {
    const segment = part.trim();
    const [column, operator, ...valueParts] = segment.split(".");
    return {
      column: column?.trim() ?? "",
      operator: operator?.trim() ?? "eq",
      value: valueParts.join(".").trim(),
    };
  });
}

function parseInValues(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [raw];
  const trimmed = raw.trim();
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice(1, -1);
    return inner.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  }
  return trimmed.split(",").map((value) => value.trim());
}

export class SupabaseClient {}

export function createClient(urlArg, keyArg, _options) {
  const state = globalThis.__SUPA_MOCK__ || { tables: {} };
  const config = { url: urlArg || DEFAULT_URL, key: keyArg || "" };
  const isMockKey = typeof keyArg === "string" && keyArg.length < 40;
  const globalFlags = /** @type {{ __SUPABASE_FORCE_REMOTE__?: boolean }} */ (
    globalThis
  );
  const forceRemote = Boolean(globalFlags.__SUPABASE_FORCE_REMOTE__);
  const useMock = isMockKey && !forceRemote;

  function buildLocalQuery(table) {
    const rows = state.tables[table] || (state.tables[table] = []);

    const filters = [];
    const orderings = [];
    let limitParam = null;
    let rangeParam = null;
    let op = "select";
    let payload = null;
    let onConflict = [];
    let ignoreDuplicates = false;
    let headOnly = false;
    let countOption = null;

    const api = {
      data: null,
      error: null,
      count: null,
      select(selection = "*", options = {}) {
        op = "select";
        headOnly = Boolean(options?.head);
        countOption = options?.count ?? countOption;
        return api;
      },
      eq(column, value) {
        filters.push({ type: "eq", column, value });
        return api;
      },
      gt(column, value) {
        filters.push({ type: "gt", column, value });
        return api;
      },
      gte(column, value) {
        filters.push({ type: "gte", column, value });
        return api;
      },
      lt(column, value) {
        filters.push({ type: "lt", column, value });
        return api;
      },
      lte(column, value) {
        filters.push({ type: "lte", column, value });
        return api;
      },
      like(column, pattern) {
        filters.push({ type: "like", column, pattern, caseInsensitive: false });
        return api;
      },
      ilike(column, pattern) {
        filters.push({ type: "like", column, pattern, caseInsensitive: true });
        return api;
      },
      is(column, value) {
        filters.push({ type: "is", column, value });
        return api;
      },
      not(column, operator, value) {
        filters.push({ type: "not", column, operator: String(operator ?? "eq"), value });
        return api;
      },
      in(column, values) {
        filters.push({ type: "in", column, values: parseInValues(values) });
        return api;
      },
      or(expression) {
        filters.push({ type: "or", conditions: parseOrExpression(expression) });
        return api;
      },
      order(column, options = {}) {
        orderings.push({
          column,
          ascending: options?.ascending !== false,
          nullsFirst: options?.nullsFirst === true,
        });
        return api;
      },
      limit(count) {
        limitParam = typeof count === "number" ? count : Number(count);
        return api;
      },
      range(from, to) {
        rangeParam = { from: Number(from), to: Number(to) };
        return api;
      },
      insert(values) {
        op = "insert";
        payload = Array.isArray(values) ? values.map(cloneRow) : [cloneRow(values)];
        return api;
      },
      update(values) {
        op = "update";
        payload = { ...values };
        return api;
      },
      upsert(values, options = {}) {
        op = "upsert";
        payload = Array.isArray(values) ? values.map(cloneRow) : [cloneRow(values)];
        onConflict = typeof options?.onConflict === "string"
          ? options.onConflict.split(",").map((value) => value.trim()).filter(Boolean)
          : [];
        ignoreDuplicates = Boolean(options?.ignoreDuplicates);
        return api;
      },
      delete() {
        op = "delete";
        payload = null;
        return api;
      },
      async single() {
        await execute();
        const arr = Array.isArray(api.data) ? api.data : api.data ? [api.data] : [];
        return { data: arr[0] ?? null, error: api.error, count: api.count };
      },
      async maybeSingle() {
        return await api.single();
      },
      then(onFulfilled, onRejected) {
        return execute()
          .then(() => ({ data: api.data, error: api.error, count: api.count }))
          .then(onFulfilled, onRejected);
      },
    };

    function matchesFilter(row, filter) {
      switch (filter.type) {
        case "eq":
          return equals(row?.[filter.column], filter.value);
        case "gt":
          return compareValues(row?.[filter.column], filter.value) > 0;
        case "gte":
          return compareValues(row?.[filter.column], filter.value) >= 0;
        case "lt":
          return compareValues(row?.[filter.column], filter.value) < 0;
        case "lte":
          return compareValues(row?.[filter.column], filter.value) <= 0;
        case "is":
          if (filter.value === null || filter.value === "null") {
            return row?.[filter.column] === null || row?.[filter.column] === undefined;
          }
          return equals(row?.[filter.column], filter.value);
        case "not": {
          if (filter.operator === "is" && (filter.value === null || filter.value === "null")) {
            return row?.[filter.column] !== null && row?.[filter.column] !== undefined;
          }
          if (filter.operator === "eq") {
            return !equals(row?.[filter.column], filter.value);
          }
          if (filter.operator === "like") {
            const regex = toRegExp(String(filter.value ?? ""));
            return !regex.test(String(row?.[filter.column] ?? ""));
          }
          return true;
        }
        case "like": {
          const flags = filter.caseInsensitive ? "i" : "";
          const regex = toRegExp(String(filter.pattern ?? ""), flags);
          return regex.test(String(row?.[filter.column] ?? ""));
        }
        case "in":
          return filter.values.some((value) => equals(row?.[filter.column], value));
        case "or":
          return filter.conditions.some((condition) => {
            const target = row?.[condition.column];
            switch (condition.operator) {
              case "eq":
                return equals(target, condition.value);
              case "neq":
                return !equals(target, condition.value);
              case "is":
                if (condition.value === "null") {
                  return target === null || target === undefined;
                }
                return equals(target, condition.value);
              case "gt":
                return compareValues(target, condition.value) > 0;
              case "gte":
                return compareValues(target, condition.value) >= 0;
              case "lt":
                return compareValues(target, condition.value) < 0;
              case "lte":
                return compareValues(target, condition.value) <= 0;
              default:
                return equals(target, condition.value);
            }
          });
        default:
          return true;
      }
    }

    function applyFilters(input) {
      if (!filters.length) return input.map((row, index) => ({ row, index }));
      return input
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => filters.every((filter) => matchesFilter(row, filter)));
    }

    function applyOrdering(input) {
      if (!orderings.length) return [...input];
      return [...input].sort((a, b) => {
        for (const order of orderings) {
          const aVal = a.row?.[order.column];
          const bVal = b.row?.[order.column];
          const aIsNull = aVal === null || aVal === undefined;
          const bIsNull = bVal === null || bVal === undefined;
          if (aIsNull && bIsNull) continue;
          if (aIsNull) return order.nullsFirst ? -1 : 1;
          if (bIsNull) return order.nullsFirst ? 1 : -1;
          const cmp = compareValues(aVal, bVal);
          if (cmp !== 0) {
            return order.ascending ? cmp : -cmp;
          }
        }
        return 0;
      });
    }

    function applyPagination(input) {
      if (rangeParam) {
        const start = Math.max(0, rangeParam.from);
        const end = Math.max(start, rangeParam.to);
        return input.slice(start, end + 1);
      }
      if (typeof limitParam === "number" && Number.isFinite(limitParam)) {
        return input.slice(0, Math.max(0, limitParam));
      }
      return input;
    }

    async function execute() {
      try {
        const filtered = applyFilters(rows);
        const ordered = applyOrdering(filtered);
        const paginated = applyPagination(ordered);

        if (op === "insert") {
          payload.forEach((row) => rows.push(cloneRow(row)));
          api.data = payload.map(cloneRow);
          api.count = payload.length;
          api.error = null;
          return;
        }

        if (op === "upsert") {
          const results = [];
          for (const entry of payload) {
            let idx = -1;
            if (onConflict.length > 0) {
              idx = rows.findIndex((row) => onConflict.every((column) => equals(row?.[column], entry?.[column])));
            }
            if (idx === -1 && filtered.length === 1) {
              idx = filtered[0].index;
            }
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...entry };
              results.push(cloneRow(rows[idx]));
            } else if (!ignoreDuplicates) {
              rows.push(cloneRow(entry));
              results.push(cloneRow(entry));
            }
          }
          api.data = results;
          api.count = results.length;
          api.error = null;
          return;
        }

        if (op === "update") {
          const results = [];
          for (const item of filtered) {
            rows[item.index] = { ...rows[item.index], ...payload };
            results.push(cloneRow(rows[item.index]));
          }
          api.data = results;
          api.count = results.length;
          api.error = null;
          return;
        }

        if (op === "delete") {
          const toRemove = [...filtered].sort((a, b) => b.index - a.index);
          const removed = [];
          for (const item of toRemove) {
            const [deleted] = rows.splice(item.index, 1);
            if (deleted) removed.push(cloneRow(deleted));
          }
          api.data = removed;
          api.count = removed.length;
          api.error = null;
          return;
        }

        // Select/query path
        const resultRows = paginated.map(({ row }) => cloneRow(row));
        api.count = countOption ? filtered.length : null;
        api.data = headOnly ? null : resultRows;
        api.error = null;
      } catch (error) {
        api.error = error instanceof Error
          ? { message: error.message }
          : { message: String(error) };
        api.data = null;
      }
    }

    return api;
  }

  function buildRemoteQuery(table) {
    const configUrl = config.url || DEFAULT_URL;
    const rows = state.tables[table] || (state.tables[table] = []);

    let selectQuery = "*";
    let countOption = null;
    let headOnly = false;
    let pendingRequest = null;
    let op = "select";
    let payload = null;
    let preferReturn = "representation";
    let preferResolutions = [];
    let limitParam = null;
    let rangeParam = null;

    const filterParams = [];
    const orderParams = [];
    let lastInsert = null;

    const api = {
      data: null,
      error: null,
      count: null,
      select(selection = "*", options = {}) {
        selectQuery = typeof selection === "string" && selection.trim()
          ? selection.split(",").map((part) => part.trim()).join(",")
          : "*";
        if (options?.count !== undefined) {
          countOption = options.count;
        }
        if (options?.head !== undefined) {
          headOnly = Boolean(options.head);
        } else if (op === "select") {
          headOnly = false;
        }
        if (op === "select") {
          queueRequest(options?.head ? "HEAD" : "GET");
        }
        return api;
      },
      eq(column, value) {
        filterParams.push([String(column), `eq.${value}`]);
        return api;
      },
      gt(column, value) {
        filterParams.push([String(column), `gt.${value}`]);
        return api;
      },
      gte(column, value) {
        filterParams.push([String(column), `gte.${value}`]);
        return api;
      },
      lt(column, value) {
        filterParams.push([String(column), `lt.${value}`]);
        return api;
      },
      lte(column, value) {
        filterParams.push([String(column), `lte.${value}`]);
        return api;
      },
      like(column, pattern) {
        filterParams.push([String(column), `like.${pattern}`]);
        return api;
      },
      ilike(column, pattern) {
        filterParams.push([String(column), `ilike.${pattern}`]);
        return api;
      },
      is(column, value) {
        const normalized = value === null ? "null" : String(value);
        filterParams.push([String(column), `is.${normalized}`]);
        return api;
      },
      not(column, operator, value) {
        const op = String(operator ?? "eq");
        const normalized = value === null ? "null" : String(value);
        filterParams.push([String(column), `not.${op}.${normalized}`]);
        return api;
      },
      in(column, values) {
        const list = parseInValues(values).join(",");
        filterParams.push([String(column), `in.(${list})`]);
        return api;
      },
      or(expression) {
        filterParams.push(["or", String(expression)]);
        return api;
      },
      order(column, options = {}) {
        const ascending = options?.ascending === false ? "desc" : "asc";
        const nullsFirst = options?.nullsFirst ? `.nulls${options.nullsFirst ? "first" : "last"}` : "";
        orderParams.push(`${column}.${ascending}${nullsFirst}`);
        return api;
      },
      limit(count) {
        limitParam = typeof count === "number" ? count : Number(count);
        return api;
      },
      range(from, to) {
        rangeParam = { from: Number(from), to: Number(to) };
        return api;
      },
      insert(values, options = {}) {
        op = "insert";
        preferReturn = options?.returning ?? "representation";
        payload = Array.isArray(values) ? values : [values];
        preferResolutions = [];
        queueRequest("POST");
        return api;
      },
      update(values) {
        op = "update";
        preferReturn = "representation";
        payload = values;
        queueRequest("PATCH");
        return api;
      },
      upsert(values, options = {}) {
        op = "upsert";
        preferReturn = options?.returning ?? "representation";
        payload = Array.isArray(values) ? values : [values];
        preferResolutions = [];
        if (options?.onConflict) {
          filterParams.push(["on_conflict", String(options.onConflict)]);
          preferResolutions.push("resolution=merge-duplicates");
        }
        if (options?.ignoreDuplicates) {
          preferResolutions.push("resolution=ignore-duplicates");
        }
        queueRequest("POST");
        return api;
      },
      delete() {
        op = "delete";
        payload = null;
        preferReturn = "representation";
        queueRequest("DELETE");
        return api;
      },
      async single() {
        await ensureExecuted();
        const arr = Array.isArray(api.data) ? api.data : api.data ? [api.data] : [];
        return { data: arr[0] ?? null, error: api.error, count: api.count };
      },
      async maybeSingle() {
        return await api.single();
      },
      then(onFulfilled, onRejected) {
        return ensureExecuted()
          .then(() => ({ data: api.data ?? null, error: api.error ?? null, count: api.count ?? null }))
          .then(onFulfilled, onRejected);
      },
    };

    function parseCount(response) {
      const header = response.headers.get("content-range");
      if (header) {
        const [, total] = header.split("/");
        if (total && total !== "*") {
          const parsed = Number(total);
          if (!Number.isNaN(parsed)) return parsed;
        }
      }
      const pref = response.headers.get("content-length");
      if (pref) {
        const parsed = Number(pref);
        if (!Number.isNaN(parsed)) return parsed;
      }
      return null;
    }

    function queueRequest(method) {
      pendingRequest = async () => {
        const prefer = [];
        if (countOption) prefer.push(`count=${countOption}`);
        if (headOnly) prefer.push("head=true");
        if (preferReturn) prefer.push(`return=${preferReturn}`);
        prefer.push(...preferResolutions);

        const url = new URL(`${configUrl.replace(/\/$/, "")}/rest/v1/${table}`);
        const selection = selectQuery?.trim();
        if (selection) {
          url.searchParams.set("select", selection);
        }
        if (typeof limitParam === "number" && Number.isFinite(limitParam)) {
          url.searchParams.set("limit", String(limitParam));
        }
        for (const [key, value] of filterParams) {
          url.searchParams.append(key, value);
        }
        for (const param of orderParams) {
          url.searchParams.append("order", param);
        }

        const headers = {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          Accept: "application/json",
        };
        if (method !== "GET" && method !== "HEAD" && payload !== null) {
          headers["Content-Type"] = "application/json";
        }
        if (prefer.length > 0) {
          headers.Prefer = prefer.join(",");
        }
        if (rangeParam) {
          const start = Math.max(0, rangeParam.from);
          const end = Math.max(start, rangeParam.to);
          headers.Range = `${start}-${end}`;
        }

        let response;
        let body = null;
        try {
          response = await fetch(url.toString(), {
            method,
            headers,
            ...(method !== "GET" && method !== "HEAD" && payload !== null
              ? { body: JSON.stringify(payload) }
              : {}),
          });
          api.count = countOption ? parseCount(response) : null;
          if (method === "HEAD" || response.status === 204) {
            api.data = null;
            api.error = response.ok ? null : { message: response.statusText };
            return;
          }
          try {
            body = await response.json();
          } catch {
            body = null;
          }
          if (!response.ok) {
            api.error = body?.error ?? { message: body?.message ?? response.statusText };
            api.data = null;
            return;
          }
          api.error = null;
          api.data = body;
          if (Array.isArray(body) && body.length > 0) {
            lastInsert = body[body.length - 1];
          } else if (body && typeof body === "object") {
            lastInsert = body;
          }
        } catch (error) {
          api.error = {
            message: error instanceof Error ? error.message : String(error),
          };
          api.data = null;
        }
      };
    }

    async function ensureExecuted() {
      if (pendingRequest) {
        const fn = pendingRequest;
        pendingRequest = null;
        await fn();
      }
      if (api.error === null && Array.isArray(api.data)) {
        // mirror successful network data into local state for downstream tests if desired
        rows.length = 0;
        for (const row of api.data) {
          rows.push(cloneRow(row));
        }
      } else if (api.error === null && lastInsert) {
        rows.push(cloneRow(lastInsert));
      }
    }

    return api;
  }

  return {
    from(table) {
      if (useMock) {
        return buildLocalQuery(table);
      }
      return buildRemoteQuery(table);
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
        return Promise.resolve({ data: { success: true }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}
