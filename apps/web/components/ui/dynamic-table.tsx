"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  Filter,
  ShieldCheck,
  SignalHigh,
  TrendingUp,
} from "lucide-react";

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
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const formatPercentage = (value: number) =>
  `${percentageFormatter.format(value)}%`;

const getChangeTone = (value: number) => {
  if (value > 0) {
    return "text-emerald-400";
  }

  if (value < 0) {
    return "text-rose-400";
  }

  return "text-muted-foreground";
};

const positions = [
  {
    id: "gm-core",
    asset: "Global Macro Multi-Strategy",
    segment: "Core" as const,
    region: "Global",
    risk: "Moderate" as const,
    exposure: 1_250_000,
    change: 2.4,
    status: "Active" as const,
    flagged: false,
    signals: ["Macro AI", "Auto hedge"],
  },
  {
    id: "digital-yield",
    asset: "Digital Yield Nodes",
    segment: "Satellite" as const,
    region: "Emerging Tech",
    risk: "High" as const,
    exposure: 840_000,
    change: 6.2,
    status: "Monitoring" as const,
    flagged: true,
    signals: ["Volatility Guard", "24h > 5%"],
  },
  {
    id: "sustainable-credit",
    asset: "Sustainable Credit Ladder",
    segment: "Income" as const,
    region: "North America",
    risk: "Low" as const,
    exposure: 460_000,
    change: 1.1,
    status: "Active" as const,
    flagged: false,
    signals: ["ESG Score 89"],
  },
  {
    id: "apac-momentum",
    asset: "Asia Pacific Momentum",
    segment: "Satellite" as const,
    region: "APAC",
    risk: "High" as const,
    exposure: 560_000,
    change: -1.5,
    status: "Monitoring" as const,
    flagged: true,
    signals: ["Momentum cooling"],
  },
  {
    id: "alt-yield",
    asset: "Alternative Yield Syndicate",
    segment: "Core" as const,
    region: "Global",
    risk: "Moderate" as const,
    exposure: 980_000,
    change: 3.8,
    status: "Active" as const,
    flagged: false,
    signals: ["Underwriting"],
  },
  {
    id: "treasury",
    asset: "Short Duration Treasuries",
    segment: "Income" as const,
    region: "United States",
    risk: "Low" as const,
    exposure: 320_000,
    change: 0.6,
    status: "On Hold" as const,
    flagged: false,
    signals: ["Liquidity event"],
  },
] satisfies Position[];

type Position = {
  id: string;
  asset: string;
  segment: Segment;
  region: string;
  risk: RiskLevel;
  exposure: number;
  change: number;
  status: Status;
  flagged: boolean;
  signals: string[];
};

type Segment = "Core" | "Satellite" | "Income";
type RiskLevel = "Low" | "Moderate" | "High";
type Status = "Active" | "Monitoring" | "On Hold";

type View = "all" | Segment;
type StatusFilter = "all" | Status;
type RiskFilter = "all" | RiskLevel;
type SortKey = "asset" | "segment" | "risk" | "exposure" | "change" | "status";
type SortDirection = "asc" | "desc";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const viewOptions: { value: View; label: string; description: string }[] = [
  {
    value: "all",
    label: "All",
    description: "Every active mandate",
  },
  {
    value: "Core",
    label: "Core",
    description: "Foundational allocations",
  },
  {
    value: "Satellite",
    label: "Satellite",
    description: "High-conviction themes",
  },
  {
    value: "Income",
    label: "Income",
    description: "Yield-oriented sleeves",
  },
];

const statusBadgeStyles: Record<Status, string> = {
  Active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Monitoring: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "On Hold": "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "Active", label: "Active" },
  { value: "Monitoring", label: "Monitoring" },
  { value: "On Hold", label: "On hold" },
];

const riskOptions: { value: RiskFilter; label: string }[] = [
  { value: "all", label: "All risk levels" },
  { value: "Low", label: "Low risk" },
  { value: "Moderate", label: "Moderate risk" },
  { value: "High", label: "High risk" },
];

const riskBadgeStyles: Record<RiskLevel, string> = {
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Moderate: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  High: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export function DynamicTable() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [sort, setSort] = useState<SortState>({
    key: "exposure",
    direction: "desc",
  });

  const filteredPositions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return positions.filter((position) => {
      if (view !== "all" && position.segment !== view) {
        return false;
      }

      if (statusFilter !== "all" && position.status !== statusFilter) {
        return false;
      }

      if (riskFilter !== "all" && position.risk !== riskFilter) {
        return false;
      }

      if (onlyFlagged && !position.flagged) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        position.asset,
        position.region,
        position.segment,
        ...position.signals,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [onlyFlagged, riskFilter, search, statusFilter, view]);

  const sortedPositions = useMemo(() => {
    return [...filteredPositions].sort((a, b) => {
      const direction = sort.direction === "asc" ? 1 : -1;
      const valueA = a[sort.key];
      const valueB = b[sort.key];

      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * direction;
      }

      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  }, [filteredPositions, sort.direction, sort.key]);

  const metrics = useMemo(() => {
    if (sortedPositions.length === 0) {
      return { totalExposure: 0, averageChange: 0, flagged: 0 };
    }

    const totalExposure = sortedPositions.reduce(
      (sum, position) => sum + position.exposure,
      0,
    );
    const averageChange = sortedPositions.reduce((sum, position) =>
      sum + position.change, 0) /
      sortedPositions.length;
    const flagged = sortedPositions.reduce(
      (count, position) => count + (position.flagged ? 1 : 0),
      0,
    );

    return { totalExposure, averageChange, flagged };
  }, [sortedPositions]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "desc" };
    });
  };

  const resetFilters = () => {
    setSearch("");
    setView("all");
    setStatusFilter("all");
    setRiskFilter("all");
    setOnlyFlagged(false);
    setSort({ key: "exposure", direction: "desc" });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge
              variant="outline"
              className="border-cyan-500/40 bg-cyan-500/10 text-xs uppercase tracking-wide text-cyan-300"
            >
              Portfolio telemetry
            </Badge>
            <CardTitle className="mt-2 text-lg font-semibold">
              Dynamic portfolio table
            </CardTitle>
            <CardDescription>
              Blend real-time filters, segmentation, and intelligent alerts for
              institutional oversight.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1 text-right text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Live guardrails
            </span>
            <span>
              Coverage synced {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <motion.div
            layout
            className="rounded-xl border border-slate-800/60 bg-gradient-to-br from-slate-900/60 via-slate-900 to-slate-950 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-medium uppercase text-muted-foreground">
              Aggregate exposure
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {currencyFormatter.format(metrics.totalExposure)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {sortedPositions.length || "0"} filtered mandates
            </p>
          </motion.div>
          <motion.div
            layout
            className="rounded-xl border border-slate-800/60 bg-gradient-to-br from-slate-900/60 via-slate-900 to-slate-950 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-medium uppercase text-muted-foreground">
              24h momentum
              <SignalHigh className="h-4 w-4 text-cyan-300" />
            </div>
            <div
              className={cn(
                "mt-2 text-2xl font-semibold",
                getChangeTone(metrics.averageChange),
              )}
            >
              {formatPercentage(metrics.averageChange)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Average move across filtered assets
            </p>
          </motion.div>
          <motion.div
            layout
            className="rounded-xl border border-slate-800/60 bg-gradient-to-br from-slate-900/60 via-slate-900 to-slate-950 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-medium uppercase text-muted-foreground">
              Alerts in focus
              <Filter className="h-4 w-4 text-amber-300" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {metrics.flagged}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Signal queues requiring human review
            </p>
          </motion.div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label htmlFor="portfolio-search" className="sr-only">
              Search positions
            </Label>
            <Input
              id="portfolio-search"
              placeholder="Search mandates, tags, or regions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full border-slate-800/80 bg-slate-950/40"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              const nextValue = Array.isArray(value) ? value[0] : value;
              setStatusFilter((nextValue ?? "all") as StatusFilter);
            }}
            options={statusOptions}
            placeholder="Status"
            surfaceClassName="rounded-xl border border-slate-800/80 bg-slate-950/40"
            inputClassName="text-sm"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            value={riskFilter}
            onValueChange={(value) => {
              const nextValue = Array.isArray(value) ? value[0] : value;
              setRiskFilter((nextValue ?? "all") as RiskFilter);
            }}
            options={riskOptions}
            placeholder="Risk"
            surfaceClassName="rounded-xl border border-slate-800/80 bg-slate-950/40"
            inputClassName="text-sm"
          />
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2">
              <div className="flex flex-wrap gap-2">
                {viewOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={view === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView(option.value)}
                    aria-pressed={view === option.value}
                    className={cn(
                      "rounded-full border-slate-800 text-xs font-medium",
                      view === option.value
                        ? "bg-cyan-500 text-white hover:bg-cyan-500"
                        : "bg-transparent text-muted-foreground hover:bg-slate-900",
                    )}
                  >
                    <span className="block leading-none">{option.label}</span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="flagged-only"
                  checked={onlyFlagged}
                  onCheckedChange={setOnlyFlagged}
                />
                <Label
                  htmlFor="flagged-only"
                  className="text-xs text-muted-foreground"
                >
                  Only flagged items
                </Label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {sortedPositions.length}{" "}
            mandates match your current view. Toggle a column heading to
            re-order the table.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={resetFilters}
          >
            Reset filters
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40 shadow-lg shadow-slate-950/30">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-950/60">
                {([
                  { key: "asset", label: "Mandate" },
                  { key: "segment", label: "Segment" },
                  { key: "risk", label: "Risk" },
                  { key: "exposure", label: "Exposure" },
                  { key: "change", label: "24h" },
                  { key: "status", label: "Status" },
                  { key: "signals", label: "Signals" },
                ] as const).map((column) => (
                  <TableHead key={column.key} className="whitespace-nowrap">
                    {column.key === "signals"
                      ? (
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {column.label}
                        </span>
                      )
                      : (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={cn(
                            "flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
                            sort.key === column.key && "text-foreground",
                          )}
                        >
                          {column.label}
                          <ArrowUpDown
                            className={cn(
                              "h-3.5 w-3.5",
                              sort.key === column.key &&
                                sort.direction === "desc"
                                ? "rotate-180"
                                : undefined,
                            )}
                          />
                        </button>
                      )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {sortedPositions.length === 0
                  ? (
                    <motion.tr
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        No mandates match the current filters.
                      </TableCell>
                    </motion.tr>
                  )
                  : (
                    sortedPositions.map((position) => (
                      <motion.tr
                        key={position.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-foreground">
                              {position.asset}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {position.region}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge
                            variant="outline"
                            className="border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300"
                          >
                            {position.segment}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              riskBadgeStyles[position.risk],
                            )}
                          >
                            {position.risk}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top font-medium">
                          {currencyFormatter.format(position.exposure)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "align-top font-medium",
                            getChangeTone(position.change),
                          )}
                        >
                          {formatPercentage(position.change)}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              statusBadgeStyles[position.status],
                            )}
                          >
                            {position.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-1">
                            {position.signals.map((signal) => (
                              <Badge
                                key={signal}
                                variant="outline"
                                className="border-slate-700/80 bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-200"
                              >
                                {signal}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
