"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  TradeJournalReport,
  TradeRecordInput,
} from "@/services/trade-journal/types";
import {
  formatPercentage,
  formatPnL,
  normaliseList,
} from "@/services/trade-journal/utils";

interface TradeFormEntry {
  symbol: string;
  direction: string;
  entryPrice: string;
  exitPrice: string;
  size: string;
  pnl: string;
  rewardRisk: string;
  setup: string;
  grade: string;
  notes: string;
  tags: string;
  checklistMisses: string;
}

const EMPTY_TRADE: TradeFormEntry = {
  symbol: "",
  direction: "",
  entryPrice: "",
  exitPrice: "",
  size: "",
  pnl: "",
  rewardRisk: "",
  setup: "",
  grade: "",
  notes: "",
  tags: "",
  checklistMisses: "",
};

function parseList(value: string): string[] {
  if (!value.trim()) {
    return [];
  }

  return normaliseList(
    value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

function safeParseJson(value: string): Record<string, unknown> {
  if (!value.trim()) {
    return {};
  }
  return JSON.parse(value) as Record<string, unknown>;
}

export function TradeJournalWorkspace() {
  const [sessionDate, setSessionDate] = useState("");
  const [sessionSummary, setSessionSummary] = useState("");
  const [objectivesInput, setObjectivesInput] = useState("");
  const [marketContext, setMarketContext] = useState("");
  const [riskEventsInput, setRiskEventsInput] = useState("");
  const [mindsetInput, setMindsetInput] = useState("");
  const [metricsInput, setMetricsInput] = useState("{}");
  const [environmentInput, setEnvironmentInput] = useState("{}");
  const [trades, setTrades] = useState<TradeFormEntry[]>([EMPTY_TRADE]);
  const [report, setReport] = useState<TradeJournalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTradeChange = useCallback(
    (index: number, field: keyof TradeFormEntry, value: string) => {
      setTrades((previous) => {
        const next = [...previous];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const handleAddTrade = useCallback(() => {
    setTrades((previous) => [...previous, { ...EMPTY_TRADE }]);
  }, []);

  const handleRemoveTrade = useCallback((index: number) => {
    setTrades((previous) =>
      previous.filter((_, tradeIndex) => tradeIndex !== index)
    );
  }, []);

  const stats = useMemo(() => {
    if (!report) return [];
    const { metadata } = report;
    return [
      { label: "Trades logged", value: metadata.tradeCount.toString() },
      { label: "Wins", value: metadata.winningTrades.toString() },
      { label: "Losses", value: metadata.losingTrades.toString() },
      { label: "Win rate", value: formatPercentage(metadata.winRate) },
      { label: "Net PnL", value: formatPnL(metadata.totalPnl) },
      { label: "Avg PnL", value: formatPnL(metadata.averagePnl) },
      {
        label: "Avg R:R",
        value: typeof metadata.averageRewardRisk === "number"
          ? metadata.averageRewardRisk.toFixed(2)
          : "—",
      },
    ];
  }, [report]);

  const tagChips = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.metadata.tagFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [report]);

  const checklistChips = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.metadata.checklistMissFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [report]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      if (!sessionDate.trim()) {
        setError("Session date is required.");
        return;
      }

      if (!sessionSummary.trim()) {
        setError("Add a short summary for the session.");
        return;
      }

      const parsedTrades: TradeRecordInput[] = [];

      for (const trade of trades) {
        const shouldInclude = trade.symbol.trim() ||
          trade.direction.trim() ||
          trade.entryPrice.trim() ||
          trade.exitPrice.trim() ||
          trade.size.trim() ||
          trade.pnl.trim();

        if (!shouldInclude) {
          continue;
        }

        const requiredFields: Array<[keyof TradeFormEntry, string]> = [
          ["symbol", trade.symbol],
          ["direction", trade.direction],
          ["entryPrice", trade.entryPrice],
          ["exitPrice", trade.exitPrice],
          ["size", trade.size],
          ["pnl", trade.pnl],
        ];

        for (const [field, value] of requiredFields) {
          if (!value.trim()) {
            setError(`Trade ${field} is required when recording a trade.`);
            return;
          }
        }

        const entryPrice = Number.parseFloat(trade.entryPrice);
        const exitPrice = Number.parseFloat(trade.exitPrice);
        const size = Number.parseFloat(trade.size);
        const pnl = Number.parseFloat(trade.pnl);

        if (
          ![entryPrice, exitPrice, size, pnl].every((value) =>
            Number.isFinite(value)
          )
        ) {
          setError(`One of the numeric fields is invalid for ${trade.symbol}.`);
          return;
        }

        let rewardRisk: number | undefined;
        if (trade.rewardRisk.trim()) {
          const parsedReward = Number.parseFloat(trade.rewardRisk);
          if (!Number.isFinite(parsedReward)) {
            setError(`Reward to risk must be numeric for ${trade.symbol}.`);
            return;
          }
          rewardRisk = parsedReward;
        }

        const parsedTrade: TradeRecordInput = {
          symbol: trade.symbol.trim(),
          direction: trade.direction.trim(),
          entryPrice,
          exitPrice,
          size,
          pnl,
          rewardRisk,
          setup: trade.setup.trim() || undefined,
          grade: trade.grade.trim() || undefined,
          notes: trade.notes.trim() || undefined,
          tags: parseList(trade.tags),
          checklistMisses: parseList(trade.checklistMisses),
        };

        parsedTrades.push(parsedTrade);
      }

      let metrics: Record<string, unknown>;
      let environment: Record<string, unknown>;

      try {
        metrics = safeParseJson(metricsInput);
      } catch (parseError) {
        setError("Metrics JSON is invalid. Ensure it is valid JSON.");
        return;
      }

      try {
        environment = safeParseJson(environmentInput);
      } catch (parseError) {
        setError("Environment JSON is invalid. Ensure it is valid JSON.");
        return;
      }

      const payload = {
        sessionDate: sessionDate.trim(),
        sessionSummary: sessionSummary.trim(),
        objectives: parseList(objectivesInput),
        marketContext: marketContext.trim(),
        trades: parsedTrades,
        riskEvents: parseList(riskEventsInput),
        mindsetNotes: parseList(mindsetInput),
        metrics,
        environment,
      };

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/tools/trade-journal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message = typeof errorBody.error === "string"
            ? errorBody.error
            : `Request failed with status ${response.status}.`;
          throw new Error(message);
        }

        const data = (await response.json()) as TradeJournalReport;
        setReport(data);
      } catch (submitError) {
        const message = submitError instanceof Error
          ? submitError.message
          : "Unable to generate the journal.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      environmentInput,
      metricsInput,
      mindsetInput,
      objectivesInput,
      riskEventsInput,
      sessionDate,
      sessionSummary,
      trades,
      marketContext,
    ],
  );

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <Card className="border border-white/10 bg-gradient-to-b from-background/30 to-background/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Session overview</CardTitle>
          <CardDescription>
            Set the context so the desk can evaluate execution against the plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-date">Session date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="market-context">Market context</Label>
              <Textarea
                id="market-context"
                placeholder="Liquidity, catalysts, or macro posture"
                value={marketContext}
                onChange={(event) => setMarketContext(event.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-summary">Session summary</Label>
            <Textarea
              id="session-summary"
              placeholder="One paragraph capturing the overall quality of execution"
              value={sessionSummary}
              onChange={(event) => setSessionSummary(event.target.value)}
              required
              rows={3}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="objectives">Objectives</Label>
              <Textarea
                id="objectives"
                placeholder="One objective per line"
                value={objectivesInput}
                onChange={(event) => setObjectivesInput(event.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk-events">Risk events</Label>
              <Textarea
                id="risk-events"
                placeholder="Drawdown breaches, platform issues, or other exceptions"
                value={riskEventsInput}
                onChange={(event) => setRiskEventsInput(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mindset">Mindset notes</Label>
            <Textarea
              id="mindset"
              placeholder="Energy, confidence, or psychological observations"
              value={mindsetInput}
              onChange={(event) => setMindsetInput(event.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-gradient-to-b from-background/30 to-background/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Trade log</CardTitle>
          <CardDescription>
            Add each executed trade with PnL, reward to risk, and any checklist
            drift.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {trades.map((trade, index) => (
            <div
              key={`trade-${index}`}
              className="rounded-lg border border-white/10 bg-background/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                  Trade {index + 1}
                </h3>
                {trades.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTrade(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    value={trade.symbol}
                    onChange={(event) =>
                      handleTradeChange(index, "symbol", event.target.value)}
                    placeholder="ES, NQ, AAPL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Input
                    value={trade.direction}
                    onChange={(event) =>
                      handleTradeChange(index, "direction", event.target.value)}
                    placeholder="long / short"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reward / Risk</Label>
                  <Input
                    value={trade.rewardRisk}
                    onChange={(event) =>
                      handleTradeChange(
                        index,
                        "rewardRisk",
                        event.target.value,
                      )}
                    placeholder="1.5"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Entry price</Label>
                  <Input
                    value={trade.entryPrice}
                    onChange={(event) =>
                      handleTradeChange(
                        index,
                        "entryPrice",
                        event.target.value,
                      )}
                    placeholder="4398.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exit price</Label>
                  <Input
                    value={trade.exitPrice}
                    onChange={(event) =>
                      handleTradeChange(index, "exitPrice", event.target.value)}
                    placeholder="4405.25"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position size</Label>
                  <Input
                    value={trade.size}
                    onChange={(event) =>
                      handleTradeChange(index, "size", event.target.value)}
                    placeholder="2"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Realized PnL</Label>
                  <Input
                    value={trade.pnl}
                    onChange={(event) =>
                      handleTradeChange(index, "pnl", event.target.value)}
                    placeholder="125.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Input
                    value={trade.grade}
                    onChange={(event) =>
                      handleTradeChange(index, "grade", event.target.value)}
                    placeholder="A / B / C"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Setup</Label>
                  <Input
                    value={trade.setup}
                    onChange={(event) =>
                      handleTradeChange(index, "setup", event.target.value)}
                    placeholder="London continuation, liquidity sweep..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Checklist misses</Label>
                  <Textarea
                    value={trade.checklistMisses}
                    onChange={(event) =>
                      handleTradeChange(
                        index,
                        "checklistMisses",
                        event.target.value,
                      )}
                    placeholder="One item per line"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Textarea
                    value={trade.tags}
                    onChange={(event) =>
                      handleTradeChange(index, "tags", event.target.value)}
                    placeholder="Momentum, breakout, news fade"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={trade.notes}
                    onChange={(event) =>
                      handleTradeChange(index, "notes", event.target.value)}
                    placeholder="Execution notes, emotions, or context"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={handleAddTrade}>
              Add trade
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-gradient-to-b from-background/30 to-background/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Desk telemetry</CardTitle>
          <CardDescription>
            Drop in metrics or environment data the journal should consider.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="metrics">Metrics JSON</Label>
            <Textarea
              id="metrics"
              value={metricsInput}
              onChange={(event) => setMetricsInput(event.target.value)}
              rows={6}
              placeholder='{"winRate": 0.52, "avgHold": "12m"}'
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="environment">Environment JSON</Label>
            <Textarea
              id="environment"
              value={environmentInput}
              onChange={(event) => setEnvironmentInput(event.target.value)}
              rows={6}
              placeholder='{"market": "US session", "volatility": "Elevated"}'
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-white/70">
          {error
            ? error
            : "Fill in the session details and trade log to generate the journal."}
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Generating..." : "Generate journal"}
        </Button>
      </div>

      {report && (
        <Card className="border border-white/10 bg-gradient-to-b from-background/20 to-background/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Journal output</CardTitle>
            <CardDescription>
              Generated insights, action items, and prompts based on your
              session data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-white/10 bg-background/60 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-white/60">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {(tagChips.length > 0 || checklistChips.length > 0) && (
              <div className="space-y-4">
                {tagChips.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                      Dominant tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tagChips.map(([tag, count]) => (
                        <Badge key={tag} variant="secondary">
                          {tag} · {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {checklistChips.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                      Checklist misses
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {checklistChips.map(([item, count]) => (
                        <Badge key={item} variant="outline">
                          {item} · {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <section className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  Session summary
                </h3>
                <p className="text-sm leading-relaxed text-white/80">
                  {report.summary}
                </p>
              </div>

              <Separator className="bg-white/10" />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    Performance highlights
                  </h4>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-white/80">
                    {report.performanceHighlights.map((item, index) => (
                      <li key={`highlight-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    Lessons captured
                  </h4>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-white/80">
                    {report.lessons.map((item, index) => (
                      <li key={`lesson-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    Next actions
                  </h4>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-white/80">
                    {report.nextActions.map((item, index) => (
                      <li key={`action-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    Mindset reflections
                  </h4>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-white/80">
                    {report.mindsetReflections.map((item, index) => (
                      <li key={`mindset-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                  Coach prompts
                </h4>
                <ul className="list-disc space-y-2 pl-5 text-sm text-white/80">
                  {report.coachPrompts.map((item, index) => (
                    <li key={`prompt-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
