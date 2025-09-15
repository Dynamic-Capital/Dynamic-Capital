import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = envSupabaseUrl;
export const supabaseAnonKey = envSupabaseAnonKey;
export const isSupabaseConfigured = Boolean(envSupabaseUrl && envSupabaseAnonKey);

type MockQueryResult<T = unknown> = {
  data: T[];
  error: null;
  count?: number;
};

type MockQueryBuilder<T> = PromiseLike<MockQueryResult<T>> & {
  select: (...args: unknown[]) => MockQueryBuilder<T>;
  order: (...args: unknown[]) => MockQueryBuilder<T>;
  limit: (...args: unknown[]) => Promise<MockQueryResult<T>>;
  range: (...args: unknown[]) => MockQueryBuilder<T>;
  eq: (...args: unknown[]) => MockQueryBuilder<T>;
  insert: (...args: unknown[]) => Promise<MockQueryResult<T>>;
  catch: Promise<MockQueryResult<T>>['catch'];
  finally: Promise<MockQueryResult<T>>['finally'];
};

function createMockQueryBuilder<T>(result: MockQueryResult<T>): MockQueryBuilder<T> {
  const resolved = Promise.resolve(result);
  const builder: Partial<MockQueryBuilder<T>> = {};

  builder.select = () => builder as MockQueryBuilder<T>;
  builder.order = () => builder as MockQueryBuilder<T>;
  builder.range = () => builder as MockQueryBuilder<T>;
  builder.eq = () => builder as MockQueryBuilder<T>;
  builder.limit = () => resolved;
  builder.insert = () => resolved;
  builder.then = resolved.then.bind(resolved);
  builder.catch = resolved.catch.bind(resolved);
  builder.finally = resolved.finally.bind(resolved);

  return builder as MockQueryBuilder<T>;
}

function createMockSupabaseClient(): SupabaseClient {
  console.warn('Missing Supabase environment variables. Using mock client.');

  return {
    from: () => createMockQueryBuilder({ data: [], error: null, count: 0 }),
    channel: () => {
      const channel = {
        on: () => channel,
        subscribe: (callback?: (status: string) => void) => {
          callback?.('SUBSCRIBED');
          return channel;
        },
        unsubscribe: () => undefined,
      };
      return channel;
    },
  } as unknown as SupabaseClient;
}

const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(envSupabaseUrl!, envSupabaseAnonKey!)
  : createMockSupabaseClient();

export { supabase };

export type Message = {
  id: number;
  user_id: number;
  username: string | null;
  text: string | null;
  date: string;
  created_at: string;
};