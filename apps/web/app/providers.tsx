"use client";

import { ReactNode, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { SUPABASE_CONFIG } from '@/config/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { TelegramAuthProvider } from '@/hooks/useTelegramAuth';
import { AdminAuthProvider } from '@/hooks/useAdminAuth';
import { CurrencyProvider } from '@/hooks/useCurrency';

export default function Providers({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState(() =>
    createBrowserClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
  );
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <QueryClientProvider client={queryClient}>
        <TelegramAuthProvider>
          <AdminAuthProvider>
            <AuthProvider>
              <CurrencyProvider>{children}</CurrencyProvider>
            </AuthProvider>
          </AdminAuthProvider>
        </TelegramAuthProvider>
      </QueryClientProvider>
    </SessionContextProvider>
  );
}
