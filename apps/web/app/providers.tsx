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
import { SupabaseProvider } from '@/context/SupabaseProvider';
import { MotionConfigProvider } from '@/components/ui/motion-config';
import {
  IconProvider,
  ToastProvider,
  ThemeProvider,
  DataThemeProvider,
  LayoutProvider,
} from '@once-ui-system/core';

export default function Providers({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState(() =>
    createBrowserClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
  );
  const [queryClient] = useState(() => new QueryClient());
  return (
    <LayoutProvider
      breakpoints={{
        s: 640,
        m: 1024,
        l: 1200,
      }}
    >
      <ThemeProvider>
        <DataThemeProvider>
          <ToastProvider>
            <IconProvider>
              <SessionContextProvider supabaseClient={supabaseClient}>
                <SupabaseProvider>
                  <QueryClientProvider client={queryClient}>
                    <MotionConfigProvider>
                      <TelegramAuthProvider>
                        <AdminAuthProvider>
                          <AuthProvider>
                            <CurrencyProvider>{children}</CurrencyProvider>
                          </AuthProvider>
                        </AdminAuthProvider>
                      </TelegramAuthProvider>
                    </MotionConfigProvider>
                  </QueryClientProvider>
                </SupabaseProvider>
              </SessionContextProvider>
            </IconProvider>
          </ToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
