import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ArrowUpRight,
  LineChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { walletData } from "@/lib/mock-data";

type AllocationMetric = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

type ActionDefinition = {
  label: string;
  description: string;
  icon: LucideIcon;
};

const ACCOUNT_ALLOCATIONS: AllocationMetric[] = [
  {
    label: "Treasury wallet",
    value: walletData.wallet,
    helper: "Ready for instant settlement flows across desks.",
    icon: Wallet,
  },
  {
    label: "Trading capital",
    value: walletData.trading,
    helper: "Deployed with leverage guardrails and hedges.",
    icon: LineChart,
  },
  {
    label: "Staking reserves",
    value: walletData.staking,
    helper: "Idle liquidity allocated to TON validators.",
    icon: ShieldCheck,
  },
];

const ACTIONS: ActionDefinition[] = [
  {
    label: "Transfer",
    description: "Rebalance desks instantly.",
    icon: ArrowLeftRight,
  },
  {
    label: "Deposit",
    description: "Top up via custody or on-ramps.",
    icon: ArrowDownToLine,
  },
  {
    label: "Withdraw",
    description: "Route capital back to cold storage.",
    icon: ArrowUpFromLine,
  },
];

export function WalletCard() {
  return (
    <Card className="relative overflow-hidden rounded-3xl border border-primary/25 bg-background/95 p-6 shadow-xl shadow-primary/10 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),transparent_68%)]" />
      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Desk balance
            </p>
            <p className="text-4xl font-semibold text-success sm:text-5xl">
              {walletData.balance}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Consolidated liquidity across treasury, trading, and staking
              accounts with real-time reconciliation.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-success/30 bg-success/10 text-success"
          >
            Live synced
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-success/25 bg-success/5 p-4">
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Profit
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-success">
              {walletData.profit.amount}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-success/90">
              <span className="flex items-center gap-1">
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-success"
                  aria-hidden
                />
                Long {walletData.profit.long}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-success/70"
                  aria-hidden
                />
                Short {walletData.profit.short}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-error/25 bg-error/5 p-4">
            <div className="flex items-center gap-2 text-error">
              <TrendingDown className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Loss exposure
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-error">
              {walletData.loss.amount}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-error/85">
              <span className="flex items-center gap-1">
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-error"
                  aria-hidden
                />
                Long {walletData.loss.long}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-error/70"
                  aria-hidden
                />
                Short {walletData.loss.short}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {ACCOUNT_ALLOCATIONS.map((allocation) => (
            <div
              key={allocation.label}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/85 p-4 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <allocation.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {allocation.label}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {allocation.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {allocation.helper}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className="group relative flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-background/80 p-4 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {action.label}
                </span>
              </div>
              <span className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                {action.description}
                <ArrowUpRight
                  className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                  aria-hidden
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
