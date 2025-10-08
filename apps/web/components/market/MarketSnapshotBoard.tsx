"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MarketAsset, MarketCategory } from "@/hooks/useMarketSnapshot";
import { cn, formatPrice } from "@/utils";
import {
  AlertTriangle,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface MarketSnapshotBoardProps {
  categories: MarketCategory[];
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  updatedAt: string | null;
  onRefresh: () => void;
}

type ChartDatum = {
  timestamp: string;
  value: number;
};

type CategoryBarDatum = {
  category: string;
  averageChange: number;
  accentColor: string;
};

type CategoryId = MarketCategory["id"];

const CARD_SKELETONS = Array.from({ length: 4 });

function formatChange(value: number) {
  const rounded = Number.isFinite(value) ? value : 0;
  const formatted = rounded.toFixed(Math.abs(rounded) < 1 ? 2 : 1);
  return `${rounded >= 0 ? "+" : ""}${formatted}%`;
}

function resolveDecimals(price: number) {
  if (price >= 100) return 2;
  if (price >= 1) return 3;
  return 4;
}

function AssetChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDatum }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0];
  const date = new Date(point.payload.timestamp);

  return (
    <div className="rounded-lg border border-border/70 bg-background/95 px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">
        {date.toLocaleString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
        })}
      </p>
      <p className="text-sm font-semibold">{point.value.toFixed(2)}</p>
    </div>
  );
}

function CategoryBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: CategoryBarDatum }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const bar = payload[0];

  return (
    <div className="rounded-lg border border-border/70 bg-background/95 px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{bar.payload.category}</p>
      <p className="text-sm font-semibold">{formatChange(bar.value)}</p>
    </div>
  );
}

function AssetPerformanceCard({
  asset,
  accentColor,
}: {
  asset: MarketAsset;
  accentColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  const decimals = resolveDecimals(asset.price);
  const formattedPrice = formatPrice(asset.price, asset.currency, undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const changeIsPositive = asset.changePercent >= 0;
  const changeColor = changeIsPositive ? "text-success" : "text-destructive";
  const ChangeIcon = changeIsPositive ? TrendingUp : TrendingDown;

  const chartData = useMemo<ChartDatum[]>(() => {
    return asset.timeseries.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    }));
  }, [asset.timeseries]);

  return (
    <Card
      className="transition-transform duration-200 hover:translate-y-[-2px] hover:shadow-xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardHeader paddingY="20" className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle as="div" className="text-base font-semibold">
              {asset.symbol}
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-widest">
              {asset.name}
            </CardDescription>
          </div>
          <Badge variant={changeIsPositive ? "success" : "destructive"}>
            {formatChange(asset.changePercent)}
          </Badge>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold leading-tight">
              {formattedPrice}
            </p>
            <p className={cn("text-xs font-medium", changeColor)}>
              <span className="inline-flex items-center gap-1">
                <ChangeIcon className="h-3.5 w-3.5" />
                {formatPrice(
                  Math.abs(asset.changeValue),
                  asset.currency,
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </span>
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-[0.24em]"
          >
            {asset.source}
          </Badge>
        </div>
      </CardHeader>
      <CardContent paddingY="20" className="gap-6">
        <div className="h-40 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id={`area-${asset.symbol}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.8} />
                  <stop
                    offset="95%"
                    stopColor={accentColor}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                dataKey="value"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(hovered ? 4 : 2)}
                width={60}
              />
              <Tooltip content={<AssetChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={2}
                fill={`url(#area-${asset.symbol})`}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketSnapshotBoard({
  categories,
  isLoading,
  error,
  isRefreshing,
  updatedAt,
  onRefresh,
}: MarketSnapshotBoardProps) {
  const [activeTab, setActiveTab] = useState<CategoryId>(() =>
    categories[0]?.id ?? "currencies"
  );

  useEffect(() => {
    if (!categories.length) {
      return;
    }

    const firstCategory = categories[0];
    const currentTabExists = categories.some((category) =>
      category.id === activeTab
    );

    if (!currentTabExists && firstCategory) {
      setActiveTab(firstCategory.id);
    }
  }, [categories, activeTab]);

  const handleTabChange = (value: string) => {
    if (categories.some((category) => category.id === value)) {
      setActiveTab(value as CategoryId);
    }
  };

  const barSeries = useMemo<CategoryBarDatum[]>(() => {
    return categories.map((category) => {
      const total = category.assets.reduce(
        (sum, asset) => sum + asset.changePercent,
        0,
      );
      const average = category.assets.length
        ? total / category.assets.length
        : 0;

      return {
        category: category.title,
        averageChange: Number(average.toFixed(2)),
        accentColor: category.accentColor,
      } satisfies CategoryBarDatum;
    });
  }, [categories]);

  if (isLoading && !categories.length) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {CARD_SKELETONS.map((_, index) => (
          <Card key={index} className="border-dashed">
            <CardHeader className="gap-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="gap-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !categories.length) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle as="div" className="text-base">
              Unable to load market snapshot
            </CardTitle>
          </div>
          <CardDescription>
            {error}. Check your connection and try refreshing the feed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={onRefresh} className="w-fit">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {barSeries.length > 0 && (
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle as="div" className="text-lg">
                  Category momentum
                </CardTitle>
                <CardDescription>
                  Average 24h percentage change by asset class segment.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={cn("gap-2", isRefreshing && "animate-pulse")}
              >
                <RefreshCcw
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
                {isRefreshing ? "Refreshing" : "Refresh"}
              </Button>
            </div>
            {updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last synchronized {new Date(updatedAt).toLocaleString()}
              </p>
            )}
          </CardHeader>
          <CardContent className="gap-6">
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={barSeries}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.2)"
                  />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
                  <Tooltip
                    content={<CategoryBarTooltip />}
                    cursor={{ fill: "rgba(148,163,184,0.15)" }}
                  />
                  <Legend />
                  <Bar
                    dataKey="averageChange"
                    name="Avg. change"
                    radius={[8, 8, 0, 0]}
                    fill={barSeries[0]?.accentColor ?? "#2563eb"}
                  >
                    {barSeries.map((entry) => (
                      <Cell key={entry.category} fill={entry.accentColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle as="div" className="text-lg">
                Live asset explorer
              </CardTitle>
              <CardDescription>
                Drill into individual assets across FX, commodities, indices,
                and crypto.
              </CardDescription>
            </div>
            {updatedAt && (
              <Badge variant="secondary">
                Updated {new Date(updatedAt).toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gap-6">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList
              aria-label="Market categories"
              className="w-full flex-wrap"
            >
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex-1 min-w-[140px]"
                >
                  {category.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {category.assets.map((asset) => (
                    <AssetPerformanceCard
                      key={`${category.id}-${asset.symbol}`}
                      asset={asset}
                      accentColor={category.accentColor}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
