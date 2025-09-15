import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client if environment variables are missing
let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Using mock client.');
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null, count: 0 }),
      insert: () => Promise.resolve({ data: [], error: null }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    }),
  } as unknown as SupabaseClient;
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

export type Message = {
  id: number;
  user_id: number;
  username: string | null;
  text: string | null;
  date: string;
  created_at: string;
};