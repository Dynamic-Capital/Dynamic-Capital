"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { Column, Heading, Tag, Text } from "@/components/dynamic-ui-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/ui/enhanced-typography";
import {
  WORKSPACE_MOBILE_CARD,
  WORKSPACE_MOBILE_RAIL_CONTAINER,
  WORKSPACE_MOBILE_RAIL_PADDING,
} from "@/components/workspaces/workspace-mobile";
import { cn } from "@/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";

const ACTIVATION_TREND = [
  { month: "Apr", readiness: 52 },
  { month: "May", readiness: 64 },
  { month: "Jun", readiness: 78 },
  { month: "Jul", readiness: 92 },
  { month: "Aug", readiness: 118 },
  { month: "Sep", readiness: 146 },
  { month: "Oct", readiness: 173 },
  { month: "Nov", readiness: 208 },
  { month: "Dec", readiness: 244 },
];

const PIPELINE_DATA = [
  { stage: "Signals trial", members: 86 },
  { stage: "Automation setup", members: 124 },
  { stage: "Mentor loop", members: 168 },
  { stage: "Desk activated", members: 214 },
];

const CHANNEL_DATA = [
  { channel: "Mentor referrals", value: 32 },
  { channel: "Automation prompts", value: 26 },
  { channel: "Performance reports", value: 18 },
  { channel: "Community events", value: 14 },
  { channel: "On-site CTAs", value: 10 },
];

const CHANNEL_COLORS = [
  "#020617",
  "#ff8f00",
  "#00897b",
  "#1e88e5",
  "#d81b60",
];

const SUMMARY_STATS = [
  {
    label: "Workflow coverage",
    value: 92,
    suffix: "%",
    description: "core desk workflows instrumented",
  },
  {
    label: "Automation adoption",
    value: 76,
    suffix: "%",
    description: "operators running automation end-to-end",
  },
  {
    label: "Mentor satisfaction",
    value: 97,
    suffix: "%",
    description: "positive mentor session feedback",
  },
] as const;

interface ChartCardProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

function ChartCard(
  { title, description, children, className }: ChartCardProps,
) {
  return (
    <Card
      className={cn(
        "h-full border-border/60 bg-background/60 shadow-sm shadow-primary/5 backdrop-blur",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        <Text as="p" variant="body-default-s" onBackground="neutral-weak">
          {description}
        </Text>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64 w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendTooltip(
  { active, payload, label }: TooltipProps<number, string>,
) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value }] = payload;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 font-medium">Readiness score: {value}</p>
    </div>
  );
}

function PipelineTooltip(
  { active, payload, label }: TooltipProps<number, string>,
) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value }] = payload;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 font-medium">Members: {value}</p>
    </div>
  );
}

function ChannelTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ name, value }] = payload;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold">{name}</p>
      <p className="mt-1 font-medium">Share: {value}%</p>
    </div>
  );
}

interface SummaryStatProps {
  label: string;
  value: number;
  suffix: string;
  description: string;
  className?: string;
}

function SummaryStat({
  label,
  value,
  suffix,
  description,
  className,
}: SummaryStatProps) {
  return (
    <Column
      gap="8"
      padding="16"
      radius="m"
      border="neutral-alpha-weak"
      background="surface"
      className={cn("min-w-[160px]", className)}
    >
      <Text variant="label-default-s" onBackground="neutral-medium">
        {label}
      </Text>
      <Heading variant="display-strong-xs">
        <CountUp end={value} suffix={suffix} />
      </Heading>
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {description}
      </Text>
    </Column>
  );
}

export function DynamicUiOptimizer() {
  const dominantChannel = useMemo(() => {
    return CHANNEL_DATA.reduce(
      (topChannel, current) =>
        current.value > topChannel.value ? current : topChannel,
      CHANNEL_DATA[0],
    );
  }, []);

  return (
    <Column gap="40" fillWidth>
      <Column gap="16" align="start" maxWidth={48}>
        <Tag size="s" background="brand-alpha-weak" prefixIcon="activity">
          Dynamic GUI activation
        </Tag>
        <Heading variant="display-strong-xs">
          Optimize onboarding and automation coverage in one dashboard
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Track how members progress through readiness milestones, identify the
          conversion gaps inside the automation pipeline, and highlight which
          activation channels bring the most resilient desk operators.
        </Text>
        <Text variant="body-default-s" onBackground="brand-medium">
          Top channel this quarter: {dominantChannel.channel} at{" "}
          {dominantChannel.value}% of activations.
        </Text>
      </Column>

      <div className={cn(WORKSPACE_MOBILE_RAIL_PADDING, "md:m-0")}>
        <div
          className={cn(
            WORKSPACE_MOBILE_RAIL_CONTAINER,
            "px-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:px-0 lg:grid-cols-3",
          )}
        >
          {SUMMARY_STATS.map((stat) => (
            <SummaryStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              description={stat.description}
              className={cn(WORKSPACE_MOBILE_CARD, "sm:min-w-[200px]")}
            />
          ))}
        </div>
      </div>

      <Column gap="24">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Readiness velocity"
            description="Weekly readiness score showing compounded automation coverage."
            className="min-h-[320px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ACTIVATION_TREND}>
                <CartesianGrid strokeDasharray="4 6" stroke="#1e293b" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="readiness"
                  stroke="#020617"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Pipeline conversion"
            description="How many members land in each automation milestone this month."
            className="min-h-[320px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PIPELINE_DATA}>
                <CartesianGrid strokeDasharray="4 6" stroke="#1e293b" />
                <XAxis
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip content={<PipelineTooltip />} />
                <Bar dataKey="members" radius={[8, 8, 0, 0]} fill="#020617" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard
          title="Activation sources"
          description="Distribution of where qualified operators originate before joining the desk."
          className="min-h-[360px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChannelTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
              />
              <Pie
                dataKey="value"
                data={CHANNEL_DATA}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={6}
              >
                {CHANNEL_DATA.map((entry, index) => (
                  <Cell
                    key={entry.channel}
                    name={entry.channel}
                    fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </Column>
    </Column>
  );
}

export default DynamicUiOptimizer;
