"use client";

import { ReactNode, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { SupabaseProvider } from '@/context/SupabaseProvider';

const SUPABASE_URL = "https://qeejuomcapbdlhnjqjcc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWp1b21jYXBiZGxobmpxamNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDE4MTUsImV4cCI6MjA2OTc3NzgxNX0.GfK9Wwx0WX_GhDIz1sIQzNstyAQIF2Jd6p7t02G44zk";

export default function Providers({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState(() =>
    createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  );
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SupabaseProvider>
            {children}
          </SupabaseProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SessionContextProvider>
  );
}
