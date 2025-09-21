"use client";

import { ReactNode, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BorderStyle,
  ChartMode,
  ChartVariant,
  DataThemeProvider,
  IconProvider,
  LayoutProvider,
  NeutralColor,
  ScalingSize,
  Schemes,
  SolidStyle,
  SolidType,
  SurfaceStyle,
  ThemeProvider,
  ToastProvider as OnceToastProvider,
  TransitionStyle,
} from '@once-ui-system/core';
import { AuthProvider } from '@/hooks/useAuth';
import { SupabaseProvider } from '@/context/SupabaseProvider';
import { MotionConfigProvider } from '@/components/ui/motion-config';
import { systemUI } from '@/resources';
import { iconLibrary } from '@/resources/icons';

const {
  basics: basicsConfig,
  dataViz: dataVizConfig,
} = systemUI;
const { style } = basicsConfig;
const { dataStyle } = dataVizConfig;

const SUPABASE_URL = "https://qeejuomcapbdlhnjqjcc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWp1b21jYXBiZGxobmpxamNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDE4MTUsImV4cCI6MjA2OTc3NzgxNX0.GfK9Wwx0WX_GhDIz1sIQzNstyAQIF2Jd6p7t02G44zk";

export default function Providers({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState(() =>
    createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  );
  const [queryClient] = useState(() => new QueryClient());

  return (
    <LayoutProvider>
      <ThemeProvider
        brand={style.brand as Schemes}
        accent={style.accent as Schemes}
        neutral={style.neutral as NeutralColor}
        solid={style.solid as SolidType}
        solidStyle={style.solidStyle as SolidStyle}
        border={style.border as BorderStyle}
        surface={style.surface as SurfaceStyle}
        transition={style.transition as TransitionStyle}
        scaling={style.scaling as ScalingSize}
      >
        <DataThemeProvider
          variant={dataStyle.variant as ChartVariant}
          mode={dataStyle.mode as ChartMode}
          height={dataStyle.height}
          axis={{
            stroke: dataStyle.axis.stroke,
          }}
          tick={{
            fill: dataStyle.tick.fill,
            fontSize: dataStyle.tick.fontSize,
            line: dataStyle.tick.line,
          }}
        >
          <OnceToastProvider>
            <IconProvider icons={iconLibrary}>
              <MotionConfigProvider>
                <SessionContextProvider supabaseClient={supabaseClient}>
                  <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                      <SupabaseProvider>
                        {children}
                      </SupabaseProvider>
                    </AuthProvider>
                  </QueryClientProvider>
                </SessionContextProvider>
              </MotionConfigProvider>
            </IconProvider>
          </OnceToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
