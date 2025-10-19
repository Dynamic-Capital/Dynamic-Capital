(globalThis as { __SUPABASE_SKIP_AUTO_SERVE__?: boolean })
  .__SUPABASE_SKIP_AUTO_SERVE__ = true;

import { assert, assertEquals } from "std/assert/mod.ts";

interface RecordedQuery {
  table?: string;
  selectColumns?: string;
  eqFilters: Array<{ field: string; value: unknown }>;
  orClause?: string;
  orderArgs?: { column: string; options: { ascending: boolean } };
}

class StubQueryBuilder {
  private readonly result: Promise<
    { data: Array<Record<string, unknown>>; error: null }
  >;

  constructor(
    private readonly rows: Array<Record<string, unknown>>,
    private readonly recorded: RecordedQuery,
  ) {
    this.result = Promise.resolve({ data: this.rows, error: null });
  }

  select(columns: string) {
    this.recorded.selectColumns = columns;
    return this;
  }

  eq(field: string, value: unknown) {
    this.recorded.eqFilters.push({ field, value });
    return this;
  }

  or(clause: string) {
    this.recorded.orClause = clause;
    return this;
  }

  order(column: string, options: { ascending: boolean }) {
    this.recorded.orderArgs = { column, options };
    return this;
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onFulfilled?: (
      value: { data: Array<Record<string, unknown>>; error: null },
    ) => TResult1 | PromiseLike<TResult1>,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.result.then(onFulfilled, onRejected ?? undefined);
  }

  catch<TResult = never>(
    onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ) {
    return this.result.catch(onRejected ?? undefined);
  }

  finally(onFinally?: (() => void) | null) {
    return this.result.finally(onFinally ?? undefined);
  }
}

Deno.test("active-promos includes promotions without expiration", async () => {
  const originalDateNow = Date.now;
  const now = new Date("2024-01-01T00:00:00Z");
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const recorded: RecordedQuery = { eqFilters: [] };
  const rows = [
    {
      code: "FRESH",
      description: "Fresh promo",
      discount_type: "percentage",
      discount_value: 10,
      valid_until: future.toISOString(),
    },
    {
      code: "FOREVER",
      description: "Forever promo",
      discount_type: "percentage",
      discount_value: 15,
      valid_until: null,
    },
  ];

  const stubClient = {
    from(table: string) {
      recorded.table = table;
      return new StubQueryBuilder(rows, recorded);
    },
  };

  const globalAny = globalThis as {
    __TEST_SUPABASE_CLIENT__?: typeof stubClient;
  };
  globalAny.__TEST_SUPABASE_CLIENT__ = stubClient;

  try {
    Date.now = () => now.getTime();

    const { handler } = await import(
      `../active-promos/index.ts?cache=${crypto.randomUUID()}`
    );

    const response = await handler(
      new Request("http://localhost/functions/v1/active-promos"),
    );

    assertEquals(response.status, 200);
    const payload = await response.json() as {
      ok: boolean;
      promotions: Array<Record<string, unknown>>;
    };

    assert(payload.ok);
    assertEquals(payload.promotions.length, 2);

    const foreverPromo = payload.promotions.find((promo) =>
      promo.code === "FOREVER"
    );
    assert(foreverPromo);
    assertEquals(foreverPromo.valid_until, null);

    assertEquals(recorded.table, "promotions");
    assertEquals(
      recorded.selectColumns,
      "code, description, discount_type, discount_value, valid_until",
    );
    assertEquals(recorded.eqFilters, [{ field: "is_active", value: true }]);
    assert(
      recorded.orClause?.startsWith(
        "(valid_until.is.null,valid_until.gte.",
      ),
    );
    assert(recorded.orClause?.endsWith(")"));
    assertEquals(recorded.orderArgs, {
      column: "created_at",
      options: { ascending: false },
    });
  } finally {
    Date.now = originalDateNow;
    delete globalAny.__TEST_SUPABASE_CLIENT__;
  }
});
