"use client";

import { useMemo, useState } from "react";

import { Column, Row, Text } from "@/components/dynamic-ui-system";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Gauge,
  LineChart as LineChartIcon,
  type LucideIcon,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { cn } from "@/utils";

const TIMEFRAME_OPTIONS = [
  { id: "session", label: "Current session" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "Last 30 days" },
] as const;

const ASSET_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type Timeframe = (typeof TIMEFRAME_OPTIONS)[number]["id"];

type SummaryMetric = {
  key: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  format: "currency" | "integer" | "decimal";
  trend: "up" | "down";
  sentiment: "positive" | "negative";
  delta: number;
  deltaUnit?: string;
  description: string;
  icon: LucideIcon;
};

type EquityPoint = {
  time: string;
  equity: number;
  signals: number;
};

type AssetSlice = {
  name: string;
  value: number;
};

type PipelineStage = {
  stage: string;
  members: number;
  conversion: number;
};

type OpportunityStatus = "Live" | "Queued" | "Monitoring";

type Opportunity = {
  instrument: string;
  bias: "Long" | "Short";
  conviction: number;
  timeframe: string;
  catalyst: string;
  status: OpportunityStatus;
};

type RiskGauge = {
  label: string;
  value: number;
  target: number;
  description: string;
};

type FocusItem = {
  title: string;
  detail: string;
  impact: "positive" | "warning";
};

type ActivityEvent = {
  time: string;
  title: string;
  description: string;
  tone: "positive" | "neutral" | "warning";
};

const SUMMARY_METRICS: Record<Timeframe, SummaryMetric[]> = {
  session: [
    {
      key: "equity",
      label: "Desk equity",
      value: 258_430,
      prefix: "$",
      format: "currency",
      trend: "up",
      sentiment: "positive",
      delta: 1.6,
      deltaUnit: "%",
      description: "vs prior session",
      icon: Activity,
    },
    {
      key: "win-rate",
      label: "Signal win rate",
      value: 72,
      suffix: "%",
      format: "integer",
      trend: "up",
      sentiment: "positive",
      delta: 4.1,
      deltaUnit: " pts",
      description: "7 day improvement",
      icon: LineChartIcon,
    },
    {
      key: "activations",
      label: "VIP activations",
      value: 18,
      format: "integer",
      trend: "up",
      sentiment: "positive",
      delta: 3,
      deltaUnit: " seats",
      description: "since open",
      icon: UsersRound,
    },
    {
      key: "response",
      label: "Desk response time",
      value: 1.8,
      suffix: " min",
      format: "decimal",
      trend: "down",
      sentiment: "positive",
      delta: 0.4,
      deltaUnit: " min",
      description: "faster than yesterday",
      icon: Gauge,
    },
  ],
  week: [
    {
      key: "equity",
      label: "Desk equity",
      value: 1_845_200,
      prefix: "$",
      format: "currency",
      trend: "up",
      sentiment: "positive",
      delta: 3.2,
      deltaUnit: "%",
      description: "vs prior week",
      icon: Activity,
    },
    {
      key: "win-rate",
      label: "Signal win rate",
      value: 69,
      suffix: "%",
      format: "integer",
      trend: "up",
      sentiment: "positive",
      delta: 2.3,
      deltaUnit: " pts",
      description: "higher than 30 day",
      icon: LineChartIcon,
    },
    {
      key: "activations",
      label: "VIP activations",
      value: 84,
      format: "integer",
      trend: "up",
      sentiment: "positive",
      delta: 12,
      deltaUnit: " seats",
      description: "net new members",
      icon: UsersRound,
    },
    {
      key: "response",
      label: "Desk response time",
      value: 2.1,
      suffix: " min",
      format: "decimal",
      trend: "down",
      sentiment: "positive",
      delta: 0.6,
      deltaUnit: " min",
      description: "faster than last week",
      icon: Gauge,
    },
  ],
  month: [
    {
      key: "equity",
      label: "Desk equity",
      value: 7_214_800,
      prefix: "$",
      format: "currency",
      trend: "up",
      sentiment: "positive",
      delta: 8.4,
      deltaUnit: "%",
      description: "vs prior month",
      icon: Activity,
    },
    {
      key: "win-rate",
      label: "Signal win rate",
      value: 66,
      suffix: "%",
      format: "integer",
      trend: "up",
      sentiment: "positive",
      delta: 3.7,
      deltaUnit: " pts",
      description: "month over month",
      icon: LineChartIcon,
    },
    {
      key: "activations",
      label: "VIP activations",
      value: 312,
      format: "integer",
      trend: "up",
      sentiment: "positive",
      delta: 54,
      deltaUnit: " seats",
      description: "net growth",
      icon: UsersRound,
    },
    {
      key: "response",
      label: "Desk response time",
      value: 2.4,
      suffix: " min",
      format: "decimal",
      trend: "down",
      sentiment: "positive",
      delta: 0.5,
      deltaUnit: " min",
      description: "faster than last month",
      icon: Gauge,
    },
  ],
};

const EQUITY_SERIES: Record<Timeframe, EquityPoint[]> = {
  session: [
    { time: "08:00", equity: 246_200, signals: 1 },
    { time: "09:00", equity: 247_800, signals: 2 },
    { time: "10:00", equity: 249_650, signals: 3 },
    { time: "11:00", equity: 252_400, signals: 4 },
    { time: "12:00", equity: 253_100, signals: 5 },
    { time: "13:00", equity: 254_980, signals: 6 },
    { time: "14:00", equity: 256_420, signals: 7 },
    { time: "15:00", equity: 257_360, signals: 7 },
    { time: "16:00", equity: 258_430, signals: 8 },
  ],
  week: [
    { time: "Mon", equity: 1_722_400, signals: 18 },
    { time: "Tue", equity: 1_754_600, signals: 22 },
    { time: "Wed", equity: 1_791_200, signals: 24 },
    { time: "Thu", equity: 1_812_100, signals: 19 },
    { time: "Fri", equity: 1_845_200, signals: 26 },
    { time: "Sat", equity: 1_838_400, signals: 12 },
    { time: "Sun", equity: 1_845_200, signals: 14 },
  ],
  month: [
    { time: "Week 1", equity: 6_784_200, signals: 82 },
    { time: "Week 2", equity: 6_912_000, signals: 87 },
    { time: "Week 3", equity: 7_034_500, signals: 91 },
    { time: "Week 4", equity: 7_214_800, signals: 96 },
  ],
};

const ASSET_MIX: Record<Timeframe, AssetSlice[]> = {
  session: [
    { name: "Forex majors", value: 42 },
    { name: "Gold & metals", value: 25 },
    { name: "Crypto momentum", value: 18 },
    { name: "Indices", value: 15 },
  ],
  week: [
    { name: "Forex majors", value: 38 },
    { name: "Gold & metals", value: 24 },
    { name: "Crypto momentum", value: 20 },
    { name: "Indices", value: 18 },
  ],
  month: [
    { name: "Forex majors", value: 36 },
    { name: "Gold & metals", value: 26 },
    { name: "Crypto momentum", value: 22 },
    { name: "Indices", value: 16 },
  ],
};

const PIPELINE_STAGES: Record<Timeframe, PipelineStage[]> = {
  session: [
    { stage: "Signals trial", members: 54, conversion: 62 },
    { stage: "Automation setup", members: 41, conversion: 54 },
    { stage: "Mentor loop", members: 28, conversion: 68 },
    { stage: "Desk activated", members: 18, conversion: 72 },
  ],
  week: [
    { stage: "Signals trial", members: 198, conversion: 58 },
    { stage: "Automation setup", members: 152, conversion: 51 },
    { stage: "Mentor loop", members: 119, conversion: 64 },
    { stage: "Desk activated", members: 84, conversion: 69 },
  ],
  month: [
    { stage: "Signals trial", members: 612, conversion: 55 },
    { stage: "Automation setup", members: 488, conversion: 49 },
    { stage: "Mentor loop", members: 372, conversion: 61 },
    { stage: "Desk activated", members: 312, conversion: 66 },
  ],
};

const OPPORTUNITIES: Record<Timeframe, Opportunity[]> = {
  session: [
    {
      instrument: "XAUUSD",
      bias: "Long",
      conviction: 86,
      timeframe: "H1 breakout",
      catalyst: "Asia session range expansion",
      status: "Live",
    },
    {
      instrument: "GBPJPY",
      bias: "Short",
      conviction: 74,
      timeframe: "M30 pullback",
      catalyst: "Carry flows fading into NY",
      status: "Monitoring",
    },
    {
      instrument: "BTCUSD",
      bias: "Long",
      conviction: 68,
      timeframe: "H2 momentum",
      catalyst: "Funding reset + desk inflows",
      status: "Live",
    },
    {
      instrument: "USOIL",
      bias: "Short",
      conviction: 62,
      timeframe: "H4 supply zone",
      catalyst: "Inventory build whisper",
      status: "Queued",
    },
  ],
  week: [
    {
      instrument: "EURUSD",
      bias: "Long",
      conviction: 71,
      timeframe: "D1 accumulation",
      catalyst: "ECB forward guidance shift",
      status: "Live",
    },
    {
      instrument: "NAS100",
      bias: "Long",
      conviction: 66,
      timeframe: "H4 impulse",
      catalyst: "AI basket earnings beat",
      status: "Monitoring",
    },
    {
      instrument: "XAGUSD",
      bias: "Long",
      conviction: 64,
      timeframe: "H2 breakout",
      catalyst: "Gold-silver ratio unwind",
      status: "Queued",
    },
    {
      instrument: "USDJPY",
      bias: "Short",
      conviction: 59,
      timeframe: "H1 reversal",
      catalyst: "Tokyo fixing offers",
      status: "Monitoring",
    },
  ],
  month: [
    {
      instrument: "ETHBTC",
      bias: "Long",
      conviction: 65,
      timeframe: "W1 rotation",
      catalyst: "Merge unlock repricing",
      status: "Monitoring",
    },
    {
      instrument: "SPX",
      bias: "Long",
      conviction: 69,
      timeframe: "D1 trend",
      catalyst: "Inflation roll-over",
      status: "Live",
    },
    {
      instrument: "DXY",
      bias: "Short",
      conviction: 58,
      timeframe: "D1 breakdown",
      catalyst: "Fed pause expectations",
      status: "Queued",
    },
    {
      instrument: "XAUUSD",
      bias: "Long",
      conviction: 72,
      timeframe: "W1 continuation",
      catalyst: "Central bank accumulation",
      status: "Live",
    },
  ],
};

const RISK_GAUGES: Record<Timeframe, RiskGauge[]> = {
  session: [
    {
      label: "Risk utilisation",
      value: 64,
      target: 72,
      description: "Desk leverage deployed versus ceiling",
    },
    {
      label: "Automation health",
      value: 92,
      target: 95,
      description: "Signal routing uptime across providers",
    },
    {
      label: "Support SLA hit",
      value: 98,
      target: 100,
      description: "Member responses under 2 minutes",
    },
  ],
  week: [
    {
      label: "Risk utilisation",
      value: 68,
      target: 72,
      description: "Average margin deployment",
    },
    {
      label: "Automation health",
      value: 94,
      target: 95,
      description: "Cross-LLM routing uptime",
    },
    {
      label: "Support SLA hit",
      value: 96,
      target: 100,
      description: "Median response under 3 minutes",
    },
  ],
  month: [
    {
      label: "Risk utilisation",
      value: 71,
      target: 75,
      description: "Peak leverage usage",
    },
    {
      label: "Automation health",
      value: 93,
      target: 95,
      description: "Automations running end-to-end",
    },
    {
      label: "Support SLA hit",
      value: 97,
      target: 100,
      description: "Tickets resolved under 5 minutes",
    },
  ],
};

const STRATEGY_FOCUS: Record<Timeframe, FocusItem[]> = {
  session: [
    {
      title: "Scale gold continuation",
      detail:
        "Maintain staggered entries while session volatility stays above 18%.",
      impact: "positive",
    },
    {
      title: "Mentor loop handoffs",
      detail:
        "Shift three VIP accounts into automation review before London close.",
      impact: "warning",
    },
    {
      title: "Crypto funding reset",
      detail: "Rebalance perpetual exposure after positive funding spike.",
      impact: "positive",
    },
  ],
  week: [
    {
      title: "GBP basket recovery",
      detail: "Layer buys if PMI beats consensus; protect under 1.2600.",
      impact: "positive",
    },
    {
      title: "Automation telemetry",
      detail: "Deploy new latency probes before next provider rotation.",
      impact: "warning",
    },
    {
      title: "Mentor conversions",
      detail: "Increase follow-ups for automation graduates within 48 hours.",
      impact: "positive",
    },
  ],
  month: [
    {
      title: "Macro hedge review",
      detail: "Audit hedge offsets as USD momentum softens across majors.",
      impact: "warning",
    },
    {
      title: "VIP upsell ladder",
      detail: "Pilot concierge analytics tier for top 20 members.",
      impact: "positive",
    },
    {
      title: "Desk automation score",
      detail: "Expand scripted recovery flows to mentor pipeline.",
      impact: "positive",
    },
  ],
};

const ACTIVITY_LOGS: Record<Timeframe, ActivityEvent[]> = {
  session: [
    {
      time: "08:42",
      title: "London open alert",
      description: "GBPJPY short triggered with 1.2R locked in trailing stop.",
      tone: "positive",
    },
    {
      time: "10:05",
      title: "VIP onboarding",
      description: "Two automation graduates moved to concierge desk tier.",
      tone: "positive",
    },
    {
      time: "12:18",
      title: "Hedge escalation",
      description: "EURUSD drawdown breaching 0.8R – manual review requested.",
      tone: "warning",
    },
    {
      time: "14:56",
      title: "Signal sync",
      description: "Multi-LLM crossover consensus refreshed for metals basket.",
      tone: "neutral",
    },
  ],
  week: [
    {
      time: "Mon",
      title: "Asia desk handover",
      description: "Risk baton passed with 92% automation uptime maintained.",
      tone: "positive",
    },
    {
      time: "Wed",
      title: "VIP concierge sprint",
      description: "Mentor pipeline delivered 18 qualified activations.",
      tone: "positive",
    },
    {
      time: "Thu",
      title: "Provider rotation",
      description: "LLM routing shifted to fallback due to latency spike.",
      tone: "warning",
    },
    {
      time: "Sat",
      title: "Signals retrospective",
      description: "Session debrief flagged crypto overexposure for review.",
      tone: "neutral",
    },
  ],
  month: [
    {
      time: "Week 1",
      title: "Automation audit",
      description: "All policy nodes passed SOC 2 checklist refresh.",
      tone: "positive",
    },
    {
      time: "Week 2",
      title: "Desk expansion",
      description: "New mentor cohort onboarded with 84% activation intent.",
      tone: "positive",
    },
    {
      time: "Week 3",
      title: "Hedge review",
      description: "Macro hedge playbook adjusted for softer USD index.",
      tone: "neutral",
    },
    {
      time: "Week 4",
      title: "Provider benchmarking",
      description: "Latency and quality metrics aligned after studio update.",
      tone: "positive",
    },
  ],
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
function renderMetricValue(metric: SummaryMetric) {
  if (metric.format === "currency") {
    return currencyFormatter.format(metric.value);
  }
  if (metric.format === "decimal") {
    return `${decimalFormatter.format(metric.value)}${metric.suffix ?? ""}`;
  }
  const formatted = integerFormatter.format(metric.value);
  return `${metric.prefix ?? ""}${formatted}${metric.suffix ?? ""}`;
}

function EquityTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const equityEntry = payload.find((entry) => entry.dataKey === "equity");
  const signalEntry = payload.find((entry) => entry.dataKey === "signals");

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold">{label}</p>
      {equityEntry && (
        <p className="mt-1">
          Equity: {currencyFormatter.format(Number(equityEntry.value))}
        </p>
      )}
      {signalEntry && (
        <p className="mt-1">
          Signals fired: {integerFormatter.format(Number(signalEntry.value))}
        </p>
      )}
    </div>
  );
}

function AssetMixTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [entry] = payload;
  const { name, value } = entry;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold">{name}</p>
      <p className="mt-1">
        Allocation: {integerFormatter.format(Number(value))}%
      </p>
    </div>
  );
}

function PipelineTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value }] = payload;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="mt-1">Members: {integerFormatter.format(Number(value))}</p>
    </div>
  );
}

function SummaryCard({
  metric,
  timeframeLabel,
}: {
  metric: SummaryMetric;
  timeframeLabel: string;
}) {
  const DeltaIcon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight;
  const deltaValue = `${metric.trend === "up" ? "+" : "-"}${
    decimalFormatter.format(metric.delta)
  }${metric.deltaUnit ?? ""}`;
  const sentimentClass = metric.sentiment === "positive"
    ? "text-emerald-400"
    : "text-rose-400";
  const displayValue = renderMetricValue(metric);

  return (
    <Card className="border-border/60 bg-background/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <metric.icon className="h-4 w-4" />
          </span>
          <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
        </div>
        <Badge
          variant="outline"
          className="border-border/40 bg-background/80 text-[11px]"
        >
          {timeframeLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {displayValue}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`flex items-center gap-1 font-medium ${sentimentClass}`}
          >
            <DeltaIcon className="h-4 w-4" />
            {deltaValue}
          </span>
          <span className="text-muted-foreground">{metric.description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const BIAS_BADGES: Record<Opportunity["bias"], string> = {
  Long: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  Short: "bg-rose-500/15 text-rose-200 border-rose-500/30",
};

const STATUS_BADGES: Record<OpportunityStatus, string> = {
  Live: "bg-primary/15 text-primary border-primary/40",
  Monitoring: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  Queued: "bg-slate-500/15 text-slate-200 border-slate-500/30",
};

const TONE_DOTS: Record<ActivityEvent["tone"], string> = {
  positive: "bg-emerald-400",
  neutral: "bg-primary",
  warning: "bg-amber-400",
};

const IMPACT_BADGES: Record<FocusItem["impact"], string> = {
  positive: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-200 border-amber-500/30",
};

export function DynamicDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("session");

  const timeframeLabel = useMemo(
    () =>
      TIMEFRAME_OPTIONS.find((option) => option.id === timeframe)?.label ?? "",
    [timeframe],
  );

  const summaryMetrics = useMemo(() => SUMMARY_METRICS[timeframe], [timeframe]);
  const equitySeries = useMemo(() => EQUITY_SERIES[timeframe], [timeframe]);
  const assetMix = useMemo(() => ASSET_MIX[timeframe], [timeframe]);
  const pipelineStages = useMemo(() => PIPELINE_STAGES[timeframe], [timeframe]);
  const opportunities = useMemo(() => OPPORTUNITIES[timeframe], [timeframe]);
  const riskGauges = useMemo(() => RISK_GAUGES[timeframe], [timeframe]);
  const focusItems = useMemo(() => STRATEGY_FOCUS[timeframe], [timeframe]);
  const activityLog = useMemo(() => ACTIVITY_LOGS[timeframe], [timeframe]);

  const peakSignals = useMemo(() => {
    if (equitySeries.length === 0) return 0;
    return equitySeries.reduce(
      (peak, point) => (point.signals > peak ? point.signals : peak),
      equitySeries[0].signals,
    );
  }, [equitySeries]);

  const leadingAllocation = useMemo(() => {
    if (assetMix.length === 0) return null;
    return assetMix.reduce(
      (top, current) => current.value > top.value ? current : top,
      assetMix[0],
    );
  }, [assetMix]);

  return (
    <Column gap="32" fillWidth>
      <Column gap="16" fillWidth>
        <div
          className="flex w-full flex-wrap gap-2 rounded-md bg-muted/50 p-1"
          aria-label="Select dashboard timeframe"
        >
          {TIMEFRAME_OPTIONS.map((option) => {
            const isActive = timeframe === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTimeframe(option.id)}
                className={cn(
                  "flex-1 rounded-md px-4 py-2 text-sm font-medium transition",
                  "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <SummaryCard
              key={`${metric.key}-${timeframe}`}
              metric={metric}
              timeframeLabel={timeframeLabel}
            />
          ))}
        </div>
      </Column>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">
                Equity & signal cadence
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-primary/15 text-xs text-primary"
              >
                Peak signals: {integerFormatter.format(peakSignals)}
              </Badge>
            </div>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Track equity drift alongside fired signals to balance allocation
              and automation pace.
            </Text>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={equitySeries}>
                  <defs>
                    <linearGradient
                      id="equityGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="hsl(var(--border) / 0.4)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    yAxisId="equity"
                    tickFormatter={(value) =>
                      currencyFormatter.format(Number(value)).replace("$", "")}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    width={64}
                  />
                  <YAxis
                    yAxisId="signals"
                    orientation="right"
                    tickFormatter={(value) =>
                      integerFormatter.format(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    width={40}
                  />
                  <Tooltip content={<EquityTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">
                        {value}
                      </span>
                    )}
                  />
                  <Area
                    yAxisId="equity"
                    type="monotone"
                    dataKey="equity"
                    name="Equity"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#equityGradient)"
                    fillOpacity={0.9}
                  />
                  <Line
                    yAxisId="signals"
                    type="monotone"
                    dataKey="signals"
                    name="Signals"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base font-semibold text-foreground">
              Allocation mix
            </CardTitle>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Concentration monitoring keeps diversification aligned with live
              conviction.
            </Text>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    stroke="hsl(var(--background))"
                    paddingAngle={3}
                  >
                    {assetMix.map((slice, index) => (
                      <Cell
                        key={`${slice.name}-${index}`}
                        fill={ASSET_COLORS[index % ASSET_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<AssetMixTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {leadingAllocation && (
              <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                <Text variant="label-default-s" onBackground="neutral-weak">
                  Dominant exposure
                </Text>
                <Text variant="heading-strong-s" onBackground="neutral-strong">
                  {leadingAllocation.name}
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {leadingAllocation.value}% of active capital allocated this
                  timeframe.
                </Text>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Activation pipeline
            </CardTitle>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Measure how prospects graduate from signal trials into full
              automation.
            </Text>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineStages}>
                  <CartesianGrid
                    stroke="hsl(var(--border) / 0.4)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="stage"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      integerFormatter.format(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    width={48}
                  />
                  <Tooltip content={<PipelineTooltip />} />
                  <Bar
                    dataKey="members"
                    name="Members"
                    radius={[8, 8, 4, 4]}
                    fill="hsl(var(--chart-3))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">
                Risk & health gauges
              </CardTitle>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              >
                <ShieldCheck className="mr-1 h-4 w-4" /> Stable
              </Badge>
            </div>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Guardrail metrics blend automation uptime with human desk
              coverage.
            </Text>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {riskGauges.map((gauge) => (
              <div key={gauge.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {gauge.label}
                  </span>
                  <span>Target {gauge.target}%</span>
                </div>
                <Progress
                  value={gauge.value}
                  max={100}
                  showLabel={false}
                  formatValue={(percentage) =>
                    `${Math.round(percentage)}%`}
                />
                <p className="text-xs text-muted-foreground">
                  {gauge.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-foreground">
              Opportunity board
            </CardTitle>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Live convictions with catalysts, conviction scores, and execution
              state.
            </Text>
          </div>
          <Badge
            variant="secondary"
            className="bg-brand-secondary/20 text-xs text-brand-secondary"
          >
            {integerFormatter.format(opportunities.length)} active setups
          </Badge>
        </CardHeader>
        <CardContent className="pt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead>Bias</TableHead>
                <TableHead>Conviction</TableHead>
                <TableHead>Timeframe & catalyst</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opportunity) => (
                <TableRow
                  key={`${opportunity.instrument}-${opportunity.timeframe}`}
                >
                  <TableCell className="font-medium text-foreground">
                    {opportunity.instrument}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border ${
                        BIAS_BADGES[opportunity.bias]
                      } text-xs`}
                    >
                      {opportunity.bias}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {integerFormatter.format(opportunity.conviction)}%
                      </span>
                      <Progress
                        value={opportunity.conviction}
                        max={100}
                        showLabel={false}
                        showValue={false}
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                        indicatorClassName="bg-gradient-to-r from-primary to-brand-secondary"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="block font-medium text-foreground">
                      {opportunity.timeframe}
                    </span>
                    {opportunity.catalyst}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={`border ${
                        STATUS_BADGES[opportunity.status]
                      } text-xs`}
                    >
                      {opportunity.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Strategy focus
            </CardTitle>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Priorities guide how the desk leans into conviction or mitigates
              risk.
            </Text>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {focusItems.map((item) => (
              <div
                key={item.title}
                className="space-y-3 rounded-2xl border border-border/50 bg-background/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <Text
                    variant="heading-strong-xs"
                    onBackground="neutral-strong"
                  >
                    {item.title}
                  </Text>
                  <Badge
                    variant="outline"
                    className={`border ${
                      IMPACT_BADGES[item.impact]
                    } text-[11px]`}
                  >
                    {item.impact === "positive" ? "On track" : "Watch"}
                  </Badge>
                </div>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {item.detail}
                </Text>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Desk timeline
            </CardTitle>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Recent automation events, escalations, and human touchpoints.
            </Text>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="space-y-4">
              {activityLog.map((event, index) => (
                <li key={`${event.time}-${event.title}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        TONE_DOTS[event.tone]
                      }`}
                    />
                    {index < activityLog.length - 1 && (
                      <span className="mt-1 h-full w-px bg-border" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {event.time}
                    </span>
                    <Text
                      variant="heading-strong-xs"
                      onBackground="neutral-strong"
                    >
                      {event.title}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {event.description}
                    </Text>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur">
        <CardHeader className="space-y-2">
          <Row gap="12" vertical="center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <Column gap="4">
              <CardTitle className="text-base font-semibold text-foreground">
                Intelligence summary
              </CardTitle>
              <Text variant="body-default-s" onBackground="neutral-weak">
                AI desk notes synthesize telemetry into an actionable narrative
                for the shift lead.
              </Text>
            </Column>
          </Row>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Text variant="body-default-m" onBackground="neutral-weak">
            Equity resilience, automation uptime, and member momentum remain
            aligned this{" "}
            {timeframeLabel.toLowerCase()}. VIP activations continue to compound
            as mentor cohorts graduate into automation inside 48 hours, while
            response times stay comfortably inside the sub-two-minute goal.
          </Text>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Maintain focus on the flagged risk nodes—gold continuation size and
            EURUSD hedge review—while letting automation carry the bulk of
            signal delivery. If the London drawdown alert escalates, rotate into
            the hedge playbook and trigger concierge outreach for the impacted
            accounts.
          </Text>
        </CardContent>
      </Card>
    </Column>
  );
}

export default DynamicDashboard;
