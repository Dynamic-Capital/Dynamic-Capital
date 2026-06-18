export interface SupabaseQueryBuilder<Row = Record<string, unknown>> {
  select(columns: string): SupabaseFilterBuilder<Row>;
}

export interface SupabaseFilterBuilder<Row = Record<string, unknown>> {
  eq(column: string, value: unknown): SupabaseRangeBuilder<Row>;
}

export interface SupabaseRangeBuilder<Row = Record<string, unknown>> {
  limit(count: number): Promise<{
    data?: Row[];
    error?: { message: string } | null;
  }>;
}

export class SupabaseClient<SchemaName extends string = "public"> {
  from<Row = Record<string, unknown>>(
    _table: string,
  ): SupabaseQueryBuilder<Row>;
}

export interface SupabaseClientOptions<_SchemaName extends string = "public"> {
  global?: Record<string, unknown>;
  auth?: Record<string, unknown>;
}

export function createClient<SchemaName extends string = "public">(
  _url: string,
  _key: string,
  _options?: SupabaseClientOptions<SchemaName>,
): SupabaseClient<SchemaName>;
