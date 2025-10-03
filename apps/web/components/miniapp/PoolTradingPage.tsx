"use client";

import { type ReactNode, useEffect } from "react";
import {
  ArrowUpRight,
  CandlestickChart,
  Clock,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/utils";
import { haptic, hideMainButton, setMainButton } from "@/lib/telegram";
import { track } from "@/lib/metrics";

type PoolMetric = {
  label: string;
  value: string;
  helper: string;
};

type ActivePool = {
  name: string;
  focus: string;
  nav: string;
  status: string;
  guardrail: string;
};

type CycleSummary = {
  cycle: string;
  roi: string;
  payout: string;
  reinvestment: string;
};

type OperationsStep = {
  step: string;
  detail: string;
};

const POOL_METRICS: readonly PoolMetric[] = [
  {
    label: "Capital deployed",
    value: "$42.5M",
    helper: "Across 3 institutionally managed pools",
  },
  {
    label: "YTD net return",
    value: "+18.4%",
    helper: "After execution costs and performance fees",
  },
  {
    label: "Current cycle payout",
    value: "$1.2M",
    helper: "Settles in 3 days for eligible investors",
  },
  {
    label: "Withdrawal notice",
    value: "7 days",
    helper: "16% reinvestment policy automatically applied",
  },
];

const ACTIVE_POOLS: readonly ActivePool[] = [
  {
    name: "Atlas Multi-Asset",
    focus: "BTC · ETH · Macro futures",
    nav: "$16.2M",
    status: "Live",
    guardrail: "Max drawdown -8% · Auto circuit breakers",
  },
  {
    name: "Helios Yield",
    focus: "TON · Stablecoin rotation",
    nav: "$9.4M",
    status: "Allocating",
    guardrail: "Liquidity sync hourly · Desk overrides available",
  },
  {
    name: "Aster Quant",
    focus: "FX baskets · AI hedging",
    nav: "$6.8M",
    status: "Live",
    guardrail: "VaR 1.2% daily · Mentor-reviewed updates",
  },
];

const CYCLE_HISTORY: readonly CycleSummary[] = [
  {
    cycle: "Mar 2025",
    roi: "+6.9%",
    payout: "$825K",
    reinvestment: "$206K",
  },
  {
    cycle: "Feb 2025",
    roi: "+5.8%",
    payout: "$774K",
    reinvestment: "$194K",
  },
  {
    cycle: "Jan 2025",
    roi: "+4.6%",
    payout: "$702K",
    reinvestment: "$176K",
  },
  {
    cycle: "Dec 2024",
    roi: "+5.1%",
    payout: "$690K",
    reinvestment: "$172K",
  },
];

const RISK_CONTROLS = [
  "Per-pool circuit breakers pause automation the moment policy thresholds trigger.",
  "Desk operators publish drawdown notes with every exposure change.",
  "All investor traffic routes through KYC/T+S monitoring with audit trails stored in Supabase.",
] as const;

const OPERATIONS_PLAYBOOK: readonly OperationsStep[] = [
  {
    step: "Intake",
    detail:
      "Submit accreditation once and reuse the compliance pack for every pool onboarding.",
  },
  {
    step: "Allocation",
    detail:
      "Desk routes capital after sign-off, applies risk governors, and mirrors allocations to the Mini App dashboard.",
  },
  {
    step: "Settlement",
    detail:
      "Monthly settlement splits payouts (64%), reinvestment (16%), and performance fees (20%) with receipts stored for audit.",
  },
];

export default function PoolTradingPage() {
  useEffect(() => {
    setMainButton("Request pool allocation", () => {
      haptic("medium");
      void track("pool_allocation_request", { surface: "miniapp" });
    });

    return () => {
      hideMainButton();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard>
        <SectionHeader
          icon={<CandlestickChart size={20} />}
          tone="sky"
          title="Dynamic Pool Trading"
          description="Managed pools with institutional controls, monthly settlements, and live guardrails."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {POOL_METRICS.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <p className="text-xs font-medium text-white/60">
                {metric.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {metric.value}
              </p>
              <p className="mt-2 text-xs text-white/60">{metric.helper}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<Users size={20} />}
          tone="emerald"
          title="Active pools"
          description="Track capital, focus, and guardrails before joining an allocation."
        />

        <div className="grid gap-3">
          {ACTIVE_POOLS.map((pool) => (
            <article
              key={pool.name}
              className="card grid gap-3 rounded-2xl border border-white/12 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">
                    {pool.name}
                  </p>
                  <p className="text-xs text-white/60">{pool.focus}</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                  {pool.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Net asset value</span>
                <span className="font-semibold text-white">{pool.nav}</span>
              </div>

              <p className="text-xs text-white/60">{pool.guardrail}</p>

              <button
                className="btn justify-between bg-white/10 text-white"
                onClick={() => {
                  haptic("light");
                  void track("pool_view_brief", {
                    pool: pool.name,
                    surface: "miniapp",
                  });
                }}
              >
                <span>View strategy brief</span>
                <ArrowUpRight size={18} />
              </button>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<Clock size={20} />}
          tone="amber"
          title="Cycle history"
          description="Monthly settlements with payouts and automatic reinvestment share."
        />

        <div className="grid gap-3">
          {CYCLE_HISTORY.map((cycle) => (
            <article
              key={cycle.cycle}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  {cycle.cycle}
                </p>
                <span className="text-xs text-white/60">
                  Net return {cycle.roi}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <dt>Payout</dt>
                  <dd className="font-semibold text-white">{cycle.payout}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Reinvestment</dt>
                  <dd className="font-semibold text-white">
                    {cycle.reinvestment}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<ShieldCheck size={20} />}
          tone="blue"
          title="Risk guardrails"
          description="Enforcement policies keep allocations inside agreed parameters."
        />

        <ul className="grid gap-3">
          {RISK_CONTROLS.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 backdrop-blur-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<FileText size={20} />}
          tone="violet"
          title="Operations playbook"
          description="Every step is mirrored in the Mini App with receipts and audit logs."
        />

        <div className="grid gap-3">
          {OPERATIONS_PLAYBOOK.map((item) => (
            <article
              key={item.step}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <p className="text-sm font-semibold text-white">{item.step}</p>
              <p className="mt-1 text-xs text-white/60">{item.detail}</p>
            </article>
          ))}
        </div>

        <button
          className="btn gap-2 bg-white text-slate-950"
          onClick={() => {
            haptic("medium");
            void track("pool_download_due_diligence", { surface: "miniapp" });
          }}
        >
          <ArrowUpRight size={18} />
          Request due diligence pack
        </button>
      </SectionCard>
    </div>
  );
}

type Tone = "sky" | "emerald" | "amber" | "blue" | "violet";

const TONE_STYLES: Record<Tone, string> = {
  sky: "bg-sky-500/15 text-sky-200",
  emerald: "bg-emerald-500/15 text-emerald-200",
  amber: "bg-amber-400/15 text-amber-200",
  blue: "bg-blue-500/15 text-blue-200",
  violet: "bg-violet-500/20 text-violet-200",
};

function SectionCard(
  { children, className }: { children: ReactNode; className?: string },
) {
  return (
    <section
      className={cn(
        "card grid gap-4 rounded-3xl border border-white/12 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  icon,
  tone,
  title,
  description,
}: {
  icon: ReactNode;
  tone: Tone;
  title: string;
  description: string;
}) {
  return (
    <header className="flex items-start gap-3">
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-2xl border border-white/10",
          TONE_STYLES[tone],
        )}
      >
        {icon}
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-white/60">{description}</p>
      </div>
    </header>
  );
}
