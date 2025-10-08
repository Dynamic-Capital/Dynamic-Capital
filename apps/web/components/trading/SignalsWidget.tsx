import type { LucideIcon } from "lucide-react";
import { Activity, AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dynamicSignals } from "@/lib/mock-data";

type IndicatorColor = (typeof dynamicSignals.indicators)[number]["color"];

const SIGNAL_META = {
  success: {
    label: "Bullish momentum",
    description: "Auto-routed to execution desk with guardrails engaged.",
    icon: TrendingUp,
    accentClass: "text-success",
    badgeClass: "bg-success/10 text-success",
    barClass: "bg-success",
  },
  warning: {
    label: "Attention required",
    description: "Copilot flagged threshold breaches for human review.",
    icon: AlertTriangle,
    accentClass: "text-warning",
    badgeClass: "bg-warning/10 text-warning",
    barClass: "bg-warning",
  },
  error: {
    label: "Risk halt",
    description: "Automation paused pending compliance confirmation.",
    icon: ShieldAlert,
    accentClass: "text-error",
    badgeClass: "bg-error/10 text-error",
    barClass: "bg-error",
  },
} satisfies Record<
  IndicatorColor,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    accentClass: string;
    badgeClass: string;
    barClass: string;
  }
>;

export function SignalsWidget() {
  const totalSignals = dynamicSignals.indicators.reduce(
    (sum, indicator) => sum + indicator.count,
    0,
  );

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/90 p-6 shadow-lg shadow-primary/10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(110,80,255,0.12),transparent_75%)]" />
      <div className="relative z-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold">Dynamic Signals</p>
              <p className="text-sm text-muted-foreground">
                Streaming telemetry from the automation desk.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success"
          >
            {dynamicSignals.status}
          </Badge>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-inner">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total alerts (rolling)</span>
            <span className="text-sm font-semibold text-foreground">
              {totalSignals}
            </span>
          </div>
          <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            {dynamicSignals.indicators.map((indicator, index) => {
              const meta = SIGNAL_META[indicator.color as IndicatorColor];
              const flexValue = Math.max(indicator.count, 1);
              return (
                <span
                  key={`${indicator.color}-${index}`}
                  className={meta.barClass}
                  style={{ flexGrow: flexValue, flexBasis: 0 }}
                />
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          {dynamicSignals.indicators.map((indicator, index) => {
            const meta = SIGNAL_META[indicator.color as IndicatorColor];
            const percentage = totalSignals
              ? Math.round((indicator.count / totalSignals) * 100)
              : 0;

            return (
              <div
                key={`${indicator.color}-${index}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.badgeClass}`}
                  >
                    <meta.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {meta.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${meta.accentClass}`}>
                    {indicator.count} signals
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {percentage}% of flow
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
