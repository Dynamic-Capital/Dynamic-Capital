"use client";

import { ReactNode, Suspense, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  ToastProvider as DynamicToastProvider,
  TransitionStyle,
} from "@/components/dynamic-ui-system";
import { AuthProvider } from "@/hooks/useAuth";
import { TelegramAuthProvider } from "@/hooks/useTelegramAuth";
import { SupabaseProvider } from "@/context/SupabaseProvider";
import { MotionConfigProvider } from "@/components/ui/motion-config";
import { dynamicUI } from "@/resources";
import { iconLibrary } from "@/resources/icons";
import { TonConnectProvider } from "@/integrations/tonconnect";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config/supabase-runtime";
import { RouteAnalytics } from "@/components/analytics/RouteAnalytics";
import { RealExperienceMetricsReporter } from "@/components/analytics/RealExperienceMetricsReporter";

const {
  basics: basicsConfig,
  dataViz: dataVizConfig,
} = dynamicUI;
const { style } = basicsConfig;
const { dataStyle } = dataVizConfig;

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
          <DynamicToastProvider>
            <IconProvider icons={iconLibrary}>
              <MotionConfigProvider>
                <SessionContextProvider supabaseClient={supabaseClient}>
                  <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                      <SupabaseProvider>
                        <TelegramAuthProvider>
                          <TonConnectProvider>
                            <Suspense fallback={null}>
                              <RouteAnalytics />
                            </Suspense>
                            <Suspense fallback={null}>
                              <RealExperienceMetricsReporter />
                            </Suspense>
                            {children}
                          </TonConnectProvider>
                        </TelegramAuthProvider>
                      </SupabaseProvider>
                    </AuthProvider>
                  </QueryClientProvider>
                </SessionContextProvider>
              </MotionConfigProvider>
            </IconProvider>
          </DynamicToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
