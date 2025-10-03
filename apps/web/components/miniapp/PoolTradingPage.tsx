"use client";

import { useEffect } from "react";
import {
  ArrowUpRight,
  CandlestickChart,
  Clock,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { haptic, hideMainButton, setMainButton } from "@/lib/telegram";
import { track } from "@/lib/metrics";

const POOL_METRICS = [
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
] as const;

const ACTIVE_POOLS = [
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
] as const;

const CYCLE_HISTORY = [
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
] as const;

const RISK_CONTROLS = [
  "Per-pool circuit breakers pause automation the moment policy thresholds trigger.",
  "Desk operators publish drawdown notes with every exposure change.",
  "All investor traffic routes through KYC/T+S monitoring with audit trails stored in Supabase.",
] as const;

const OPERATIONS_PLAYBOOK = [
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
] as const;

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
    <div className="grid gap-4">
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(48, 194, 242, 0.12)",
              color: "var(--tg-accent)",
            }}
          >
            <CandlestickChart size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Dynamic Pool Trading</h1>
            <p className="muted" style={{ margin: 0 }}>
              Managed pools with institutional controls, monthly settlements,
              and live guardrails.
            </p>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          {POOL_METRICS.map((metric) => (
            <div
              key={metric.label}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gap: 6,
              }}
            >
              <span className="muted" style={{ fontSize: 12 }}>
                {metric.label}
              </span>
              <strong style={{ fontSize: 18 }}>{metric.value}</strong>
              <span className="muted" style={{ fontSize: 12 }}>
                {metric.helper}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(34, 197, 94, 0.12)",
              color: "rgba(74, 222, 128, 1)",
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Active pools</h2>
            <p className="muted" style={{ margin: 0 }}>
              Track capital, focus, and guardrails before joining an allocation.
            </p>
          </div>
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          {ACTIVE_POOLS.map((pool) => (
            <div
              key={pool.name}
              className="card"
              style={{
                display: "grid",
                gap: 8,
                padding: "14px 16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={{ fontSize: 16 }}>{pool.name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {pool.focus}
                  </span>
                </div>
                <span
                  className="muted"
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {pool.status}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                }}
              >
                <span>Net asset value</span>
                <strong>{pool.nav}</strong>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                {pool.guardrail}
              </p>
              <button
                className="btn"
                style={{ justifyContent: "space-between" }}
                onClick={() => {
                  haptic("light");
                  void track("pool_view_brief", { pool: pool.name });
                }}
              >
                <span>View strategy brief</span>
                <ArrowUpRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(234, 179, 8, 0.12)",
              color: "rgba(250, 204, 21, 1)",
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Cycle history</h2>
            <p className="muted" style={{ margin: 0 }}>
              Monthly settlements with payouts and automatic reinvestment share.
            </p>
          </div>
        </header>

        <div style={{ display: "grid", gap: 10 }}>
          {CYCLE_HISTORY.map((cycle) => (
            <div
              key={cycle.cycle}
              style={{
                display: "grid",
                gap: 6,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>{cycle.cycle}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  Net return {cycle.roi}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>Payout</span>
                <strong>{cycle.payout}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>Reinvestment</span>
                <strong>{cycle.reinvestment}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(59, 130, 246, 0.12)",
              color: "rgba(96, 165, 250, 1)",
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Risk guardrails</h2>
            <p className="muted" style={{ margin: 0 }}>
              Enforcement policies keep allocations inside agreed parameters.
            </p>
          </div>
        </header>

        <ul style={{ display: "grid", gap: 10, padding: 0, margin: 0 }}>
          {RISK_CONTROLS.map((item) => (
            <li
              key={item}
              style={{
                listStyle: "none",
                fontSize: 13,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(147, 112, 219, 0.12)",
              color: "rgba(167, 139, 250, 1)",
            }}
          >
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Operations playbook</h2>
            <p className="muted" style={{ margin: 0 }}>
              Every step is mirrored in the Mini App with receipts and audit
              logs.
            </p>
          </div>
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          {OPERATIONS_PLAYBOOK.map((item) => (
            <div
              key={item.step}
              style={{
                display: "grid",
                gap: 4,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <strong>{item.step}</strong>
              <span className="muted" style={{ fontSize: 12 }}>
                {item.detail}
              </span>
            </div>
          ))}
        </div>

        <button
          className="btn"
          onClick={() => {
            haptic("medium");
            void track("pool_download_due_diligence", { surface: "miniapp" });
          }}
        >
          <ArrowUpRight size={18} />
          Request due diligence pack
        </button>
      </section>
    </div>
  );
}
