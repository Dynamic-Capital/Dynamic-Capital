// deno-lint-ignore-file no-explicit-any
import { createClient as runtimeCreateClient } from "./supabase-js@2.js";

export type SupabaseClientOptions<Role extends string = "public"> = {
  global?: {
    headers?: Record<string, string>;
  };
  [key: string]: any;
};

export type SupabaseQueryResponse<T = any> = {
  data: T | T[] | null;
  error: any;
  count: number | null;
};

export type SupabaseQueryResult<T = any> = Promise<SupabaseQueryResponse<T>>;

export interface SupabaseQueryBuilder<T = any>
  extends Promise<SupabaseQueryResponse<T>> {
  data: T | T[] | null;
  error: any;
  count: number | null;
  select: (...args: any[]) => SupabaseQueryBuilder<T>;
  eq: (column: string, value: any) => SupabaseQueryBuilder<T>;
  gt: (column: string, value: any) => SupabaseQueryBuilder<T>;
  gte: (column: string, value: any) => SupabaseQueryBuilder<T>;
  lt: (column: string, value: any) => SupabaseQueryBuilder<T>;
  lte: (column: string, value: any) => SupabaseQueryBuilder<T>;
  like: (column: string, pattern: string) => SupabaseQueryBuilder<T>;
  ilike: (column: string, pattern: string) => SupabaseQueryBuilder<T>;
  is: (column: string, value: any) => SupabaseQueryBuilder<T>;
  not: (column: string, operator: string, value: any) => SupabaseQueryBuilder<T>;
  in: (column: string, values: any[] | string) => SupabaseQueryBuilder<T>;
  or: (expression: string) => SupabaseQueryBuilder<T>;
  order: (column: string, options?: any) => SupabaseQueryBuilder<T>;
  limit: (value: number) => SupabaseQueryBuilder<T>;
  range: (from: number, to: number) => SupabaseQueryBuilder<T>;
  maybeSingle: () => SupabaseQueryResult<T>;
  single: () => SupabaseQueryResult<T>;
  insert: (values: any, options?: any) => SupabaseQueryBuilder<T>;
  update: (values: any, options?: any) => SupabaseQueryBuilder<T>;
  upsert: (values: any, options?: any) => SupabaseQueryBuilder<T>;
  then: SupabaseQueryResult<T>["then"];
  catch: SupabaseQueryResult<T>["catch"];
  finally: SupabaseQueryResult<T>["finally"];
}

export type SupabaseClient = {
  from: (table: string) => SupabaseQueryBuilder;
  rpc: (fn: string, params?: Record<string, unknown>) => SupabaseQueryResult;
};

export const createClient = runtimeCreateClient as (
  url?: string,
  key?: string,
  options?: SupabaseClientOptions,
) => SupabaseClient;
