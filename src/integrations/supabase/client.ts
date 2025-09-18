// Consolidated Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qeejuomcapbdlhnjqjcc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWp1b21jYXBiZGxobmpxamNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDE4MTUsImV4cCI6MjA2OTc3NzgxNX0.GfK9Wwx0WX_GhDIz1sIQzNstyAQIF2Jd6p7t02G44zk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };