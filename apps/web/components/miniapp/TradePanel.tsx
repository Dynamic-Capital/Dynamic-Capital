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
    <div className="space-y-6">
      <section className="miniapp-panel space-y-4 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Trade Panel
            </h2>
            <p className="text-sm text-muted-foreground">
              Deploy house-tested playbooks with dynamic sizing.
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
        </header>

        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Select a position template
          </span>
          <fieldset className="space-y-3">
            <legend className="sr-only">Position template options</legend>
            {POSITION_TEMPLATES.map((template) => {
              const isActive = template.id === selectedTemplate;
              return (
                <button
                  key={template.id}
                  className={`w-full p-4 rounded-lg border transition-all duration-200 text-left touch-target ${
                    isActive
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/30 border-border hover:border-primary/20 hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    haptic("medium");
                    void track("trade_select_template");
                  }}
                  aria-pressed={isActive}
                  role="radio"
                  aria-label={`Select ${template.title} position template`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">
                        {template.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Size {template.size}
                      </div>
                    </div>
                    <div className="text-right text-xs space-y-1">
                      <div className="text-muted-foreground">
                        Stop {template.stop}
                      </div>
                      <div className="text-muted-foreground">
                        Target {template.target}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </fieldset>
        </div>
      </section>

      <section className="miniapp-panel space-y-4 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Risk Controls
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure stop discipline and trade routing.
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </header>
        <fieldset className="space-y-3">
          <legend className="sr-only">Risk control options</legend>
          {RISK_SCENARIOS.map((scenario) => {
            const isActive = scenario.id === riskProfile;
            return (
              <button
                key={scenario.id}
                className={`w-full p-4 rounded-lg border transition-all duration-200 text-left flex justify-between items-center touch-target ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/30 border-border hover:border-primary/20 hover:bg-muted/50"
                }`}
                onClick={() => {
                  setRiskProfile(scenario.id);
                  haptic("light");
                  void track("trade_select_risk");
                }}
                aria-pressed={isActive}
                role="radio"
                aria-label={`Select ${scenario.label} risk profile`}
              >
                <div className="space-y-1">
                  <div className="font-semibold text-sm">{scenario.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {scenario.description}
                  </div>
                </div>
                <Radio
                  className={`h-4 w-4 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </button>
            );
          })}
        </fieldset>
      </section>

      {summary.template && summary.risk && (
        <section className="miniapp-panel space-y-4 p-6 border-primary/20 bg-primary/5">
          <header className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Execution Summary
              </h3>
              <p className="text-sm text-muted-foreground">
                Desk will confirm sizing before routing to exchange.
              </p>
            </div>
            <ShieldAlert className="h-5 w-5 text-primary" />
          </header>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template:</span>
              <span className="font-medium">{summary.template.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk profile:</span>
              <span className="font-medium">{summary.risk.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stop:</span>
              <span className="font-medium">{summary.template.stop}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-medium">{summary.template.target}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{summary.template.size}</span>
            </div>
          </div>
          <button
            className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 touch-target"
            onClick={() => {
              haptic("medium");
              void track("trade_confirm_signal");
            }}
          >
            <ArrowUpRight className="h-4 w-4" />
            Confirm & route
          </button>
        </section>
      )}
    </div>
  );
}
