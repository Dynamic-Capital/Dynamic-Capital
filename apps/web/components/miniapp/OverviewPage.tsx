"use client";

import { type ComponentType, useMemo } from "react";
import {
  Activity,
  CalendarClock,
  LineChart,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";

type Metric = {
  label: string;
  value: string;
  delta: string;
  icon: ComponentType<{ size?: number }>;
};

type Priority = {
  title: string;
  description: string;
  owner: string;
};

export default function OverviewPage() {
  const metrics = useMemo<Metric[]>(
    () => [
      {
        label: "Capital Deployed",
        value: "$4.8M",
        delta: "+6.4% WoW",
        icon: TrendingUp,
      },
      {
        label: "Win Rate",
        value: "62.3%",
        delta: "+2.1% vs. target",
        icon: ShieldCheck,
      },
      {
        label: "Desk Velocity",
        value: "87 trades",
        delta: "Active in 9 markets",
        icon: Activity,
      },
    ],
    [],
  );

  const priorities: Priority[] = [
    {
      title: "Liquidity rotation",
      description: "Shift 15% of BTC profits into mid-cap AI narrative basket.",
      owner: "Lead: Mason",
    },
    {
      title: "Macro catalyst prep",
      description: "Draft playbook for FOMC and Nvidia earnings crossfire.",
      owner: "Owner: Ava",
    },
  ];

  return (
    <div className="grid gap-4">
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Desk Overview</h2>
            <p className="muted" style={{ margin: 0 }}>
              Capital allocation, momentum, and execution highlights.
            </p>
          </div>
          <button
            className="btn"
            style={{ background: "var(--brand-surface)", border: "none" }}
            onClick={() => {
              haptic("medium");
              void track("overview_open_report");
            }}
          >
            <LineChart size={16} />
            Export report
          </button>
        </header>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          }}
        >
          {metrics.map(({ label, value, delta, icon: Icon }) => (
            <div
              key={label}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "14px",
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Icon size={16} />
                </span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {label}
                </span>
              </div>
              <strong style={{ fontSize: 18 }}>{value}</strong>
              <span className="muted" style={{ fontSize: 12 }}>{delta}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 14 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0 }}>Desk Priorities</h3>
            <p className="muted" style={{ margin: 0 }}>
              What the team is shipping over the next 48 hours.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--brand-text)",
            }}
          >
            <CalendarClock size={16} />
            Updated hourly
          </div>
        </header>
        <div style={{ display: "grid", gap: 12 }}>
          {priorities.map((priority) => (
            <article
              key={priority.title}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "16px",
                display: "grid",
                gap: 8,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{priority.title}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {priority.owner}
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--brand-text)" }}>
                {priority.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
