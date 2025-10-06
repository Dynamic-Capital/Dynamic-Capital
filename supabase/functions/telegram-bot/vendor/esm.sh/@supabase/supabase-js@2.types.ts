// deno-lint-ignore-file no-explicit-any
import { createClient as runtimeCreateClient } from "./supabase-js@2.js";

export type SupabaseClientOptions<Role extends string = "public"> = {
  global?: {
    headers?: Record<string, string>;
  };
  [key: string]: any;
};

export type SupabaseQueryResult<T = any> = Promise<{ data: T | null; error: any } | { data: null; error: any } | { data: T; error: null }>;

export type SupabaseQueryBuilder<T = any> = {
  select: (...args: any[]) => SupabaseQueryBuilder<T>;
  eq: (column: string, value: any) => SupabaseQueryBuilder<T>;
  limit: (value: number) => SupabaseQueryBuilder<T>;
  maybeSingle: () => SupabaseQueryResult<T>;
  single: () => SupabaseQueryResult<T>;
  insert: (values: any, options?: any) => SupabaseQueryResult<T>;
  update: (values: any, options?: any) => SupabaseQueryResult<T>;
  upsert: (values: any, options?: any) => SupabaseQueryResult<T>;
};

export type SupabaseClient = {
  from: (table: string) => SupabaseQueryBuilder;
  rpc: (fn: string, params?: Record<string, unknown>) => SupabaseQueryResult;
};

export const createClient = runtimeCreateClient as (
  url?: string,
  key?: string,
  options?: SupabaseClientOptions,
) => SupabaseClient;
