"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, Radio, ShieldAlert } from "lucide-react";

import { haptic, hideMainButton, setMainButton } from "@/lib/telegram";
import { track } from "@/lib/metrics";

type PositionTemplate = {
  id: string;
  title: string;
  size: string;
  stop: string;
  target: string;
};

type RiskScenario = {
  id: string;
  label: string;
  description: string;
};

const POSITION_TEMPLATES: PositionTemplate[] = [
  {
    id: "scalp-long",
    title: "BTC Scalp Long",
    size: "1.5% equity",
    stop: "$67,980",
    target: "$69,450",
  },
  {
    id: "eth-breakout",
    title: "ETH Breakout",
    size: "2.0% equity",
    stop: "$3,480",
    target: "$3,720",
  },
  {
    id: "sol-retrace",
    title: "SOL Pullback",
    size: "1.0% equity",
    stop: "$179.00",
    target: "$194.00",
  },
];

const RISK_SCENARIOS: RiskScenario[] = [
  {
    id: "low",
    label: "Conservative",
    description: "Tighter stops, 0.8x size multiplier",
  },
  {
    id: "base",
    label: "Balanced",
    description: "Default risk profile from signals desk",
  },
  {
    id: "high",
    label: "Aggressive",
    description: "Wider stops, 1.2x size multiplier",
  },
];

export default function TradePanel() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    "scalp-long",
  );
  const [riskProfile, setRiskProfile] = useState<string>("base");

  const summary = useMemo(() => {
    const template = POSITION_TEMPLATES.find((item) =>
      item.id === selectedTemplate
    );
    const risk = RISK_SCENARIOS.find((item) => item.id === riskProfile);
    return {
      template,
      risk,
    };
  }, [riskProfile, selectedTemplate]);

  useEffect(() => {
    setMainButton("Route to Desk", () => {
      haptic("medium");
      void track("trade_route_to_desk");
    });
    return () => hideMainButton();
  }, []);

  return (
    <div className="grid gap-4">
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Trade Panel</h2>
            <p className="muted" style={{ margin: 0 }}>
              Deploy house-tested playbooks with dynamic sizing.
            </p>
          </div>
          <ArrowUpRight size={18} />
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Select a position template
          </span>
          <div style={{ display: "grid", gap: 10 }}>
            {POSITION_TEMPLATES.map((template) => {
              const isActive = template.id === selectedTemplate;
              return (
                <button
                  key={template.id}
                  className="btn"
                  style={{
                    justifyContent: "space-between",
                    background: isActive
                      ? "rgba(110,231,183,0.16)"
                      : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--brand-text)",
                  }}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    haptic("medium");
                    void track("trade_select_template");
                  }}
                >
                  <div style={{ display: "grid", gap: 6, textAlign: "left" }}>
                    <strong>{template.title}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Size {template.size}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      textAlign: "right",
                      fontSize: 12,
                    }}
                  >
                    <span>Stop {template.stop}</span>
                    <span>Target {template.target}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0 }}>Risk Controls</h3>
            <p className="muted" style={{ margin: 0 }}>
              Configure stop discipline and trade routing.
            </p>
          </div>
          <BarChart3 size={18} />
        </header>
        <div style={{ display: "grid", gap: 12 }}>
          {RISK_SCENARIOS.map((scenario) => {
            const isActive = scenario.id === riskProfile;
            return (
              <button
                key={scenario.id}
                className="btn"
                style={{
                  justifyContent: "space-between",
                  background: isActive
                    ? "rgba(96,165,250,0.16)"
                    : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--brand-text)",
                }}
                onClick={() => {
                  setRiskProfile(scenario.id);
                  haptic("light");
                  void track("trade_select_risk");
                }}
              >
                <div style={{ display: "grid", textAlign: "left" }}>
                  <strong>{scenario.label}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {scenario.description}
                  </span>
                </div>
                <Radio size={16} opacity={isActive ? 1 : 0.4} />
              </button>
            );
          })}
        </div>
      </section>

      {summary.template && summary.risk && (
        <section className="card" style={{ display: "grid", gap: 14 }}>
          <header style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ margin: 0 }}>Execution Summary</h3>
              <p className="muted" style={{ margin: 0 }}>
                Desk will confirm sizing before routing to exchange.
              </p>
            </div>
            <ShieldAlert size={18} />
          </header>
          <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
            <span>
              Template <strong>{summary.template.title}</strong>
            </span>
            <span>
              Risk profile <strong>{summary.risk.label}</strong>
            </span>
            <span>
              Stop <strong>{summary.template.stop}</strong> · Target{" "}
              <strong>{summary.template.target}</strong>
            </span>
            <span>
              Size <strong>{summary.template.size}</strong>
            </span>
          </div>
          <button
            className="btn"
            onClick={() => {
              haptic("medium");
              void track("trade_confirm_signal");
            }}
          >
            <ArrowUpRight size={18} />
            Confirm & route
          </button>
        </section>
      )}
    </div>
  );
}
