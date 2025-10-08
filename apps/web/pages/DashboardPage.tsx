import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  ArrowUpRight,
  Coins,
  Gauge,
  GraduationCap,
  LineChart,
  Network,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { WalletCard } from "@/components/trading/WalletCard";
import { SignalsWidget } from "@/components/trading/SignalsWidget";
import { Card } from "@/components/ui/card";
import { dynamicSignals, poolTrading, walletData } from "@/lib/mock-data";

type LearningPath = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type AccountSegment = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

type Guardrail = {
  label: string;
  detail: string;
  icon: LucideIcon;
};

const LEARNING_PATHS: LearningPath[] = [
  {
    label: "Dynamic mentorship",
    description:
      "Pair with desk leads for scenario planning and trade reviews.",
    href: "/tools/dynamic-trade-and-learn",
    icon: Users,
  },
  {
    label: "Dynamic free course",
    description: "Foundation modules for AI-assisted trading operations.",
    href: "/school",
    icon: GraduationCap,
  },
  {
    label: "Learn about Web3",
    description:
      "Track emerging protocols, infrastructure, and liquidity flows.",
    href: "/blog",
    icon: Network,
  },
  {
    label: "Learn about DC Tokens",
    description: "Tokenomics, governance, and treasury strategies for DCT.",
    href: "/token",
    icon: Coins,
  },
];

const ACCOUNT_SEGMENTS: AccountSegment[] = [
  {
    label: "Treasury wallet",
    value: walletData.wallet,
    helper: "Settlement and operational liquidity.",
    icon: Wallet,
  },
  {
    label: "Trading capital",
    value: walletData.trading,
    helper: "Deployed across active automation strategies.",
    icon: LineChart,
  },
  {
    label: "Staking reserves",
    value: walletData.staking,
    helper: "Allocated to validator support and governance.",
    icon: ShieldCheck,
  },
];

const GUARDRAILS: Guardrail[] = [
  {
    label: "Circuit breakers",
    detail: "Auto halts triggered beyond 2% drawdown.",
    icon: AlarmClock,
  },
  {
    label: "Compliance logging",
    detail: "Every move anchored to the TON ledger and audit trail.",
    icon: ScrollText,
  },
  {
    label: "Multisig approvals",
    detail: "4-of-6 guardians required for capital deployment.",
    icon: ShieldCheck,
  },
];

export function DashboardSection() {
  const chartMax = poolTrading.chartData.reduce(
    (max, point) => Math.max(max, point.value),
    1,
  );

  return (
    <section id="dashboard" className="py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex flex-col gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 self-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary md:self-start">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Trading desk
            </span>
            <h2 className="text-4xl font-semibold sm:text-5xl">
              Trading Dashboard
            </h2>
            <p className="text-base text-muted-foreground md:max-w-2xl">
              Monitor liquidity, automation signals, and learning resources from
              a responsive control center optimised for execution and oversight.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <span
                className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success"
                aria-hidden
              />
              Signals {dynamicSignals.status}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              Desk capacity 82%
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-8">
            <WalletCard />
            <Card className="rounded-3xl border border-border/60 bg-background/90 p-6 shadow-lg shadow-primary/10">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      Operational balances
                    </p>
                    <h3 className="text-xl font-semibold text-foreground">
                      Segmentation across desks
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Treasury, trading, and staking flows remain isolated with
                      granular guardrails and audit trails.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    Guarded
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {ACCOUNT_SEGMENTS.map((segment) => (
                    <div
                      key={segment.label}
                      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <segment.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          {segment.label}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {segment.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {segment.helper}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {GUARDRAILS.map((guardrail) => (
                    <div
                      key={guardrail.label}
                      className="flex h-full flex-col gap-2 rounded-2xl border border-border/50 bg-background/75 p-4 shadow-inner"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <guardrail.icon
                          className="h-4 w-4 text-primary"
                          aria-hidden
                        />
                        {guardrail.label}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {guardrail.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
          <div className="space-y-8">
            <SignalsWidget />
            <Card className="relative overflow-hidden rounded-3xl border border-error/40 bg-gradient-to-br from-error/20 via-error/10 to-error/20 p-6 text-error-foreground shadow-lg shadow-error/20">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),transparent_70%)]" />
              <div className="relative z-10 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-error-foreground/30 bg-error/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                      Liquidity engine
                    </span>
                    <h3 className="text-2xl font-semibold">
                      {poolTrading.title}
                    </h3>
                    <p className="text-sm text-error-foreground/85">
                      {poolTrading.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-error-foreground/40 bg-error/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                    High yield
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]">
                  <div className="flex h-28 items-end gap-2 rounded-2xl bg-error-foreground/10 p-3 shadow-inner">
                    {poolTrading.chartData.map((point, index) => (
                      <span
                        key={`pool-bar-${index}`}
                        className="flex-1 rounded-t-2xl bg-gradient-to-t from-error/40 to-error-foreground/80"
                        style={{
                          height: `${
                            Math.max(
                              (point.value / chartMax) * 100,
                              8,
                            )
                          }%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-error-foreground/85">
                        Growth
                      </span>
                      <span className="text-lg font-semibold">
                        {poolTrading.growth}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-error-foreground/85">
                        Success rate
                      </span>
                      <span className="text-lg font-semibold">
                        {poolTrading.successRate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-error-foreground/85">
                        Balance
                      </span>
                      <span className="text-lg font-semibold">
                        {poolTrading.balance}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-error-foreground/30 pt-4 text-xs text-error-foreground/85">
                  <p className="max-w-xs">
                    Connect to stream aggregated pool positions, counterparties,
                    and guardrails before deploying capital.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-error-foreground/40 bg-error/30 px-4 py-2 font-semibold uppercase tracking-[0.18em] transition hover:border-error-foreground/60 hover:bg-error/40"
                  >
                    Connect
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </Card>
            <Card className="rounded-3xl border border-border/60 bg-background/90 p-6 shadow-lg shadow-primary/10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                    Learn &amp; earn
                  </p>
                  <h3 className="text-xl font-semibold text-foreground">
                    Dynamic Learn And Earn
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Expand desk coverage with curated knowledge loops and
                    real-world trading experiences.
                  </p>
                </div>
                <div className="divide-y divide-border/60">
                  {LEARNING_PATHS.map((path) => (
                    <Link
                      key={path.href}
                      href={path.href}
                      className="group flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <path.icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {path.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {path.description}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSection />
    </div>
  );
}
