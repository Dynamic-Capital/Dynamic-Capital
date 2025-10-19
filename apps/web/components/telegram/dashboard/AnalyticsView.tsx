"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIsoDateTime } from "@/utils/isoFormat";
import { formatPrice } from "@/utils/format-price";
import { DEFAULT_LOCALE } from "@/config/localization";
import type { AnalyticsData } from "./types";
import { ViewHeader } from "./ViewHeader";

interface AnalyticsViewProps {
  onBack: () => void;
}

const DEFAULT_CURRENCY = "USD";

const formatCurrency = (value: number, currency: string | null | undefined) =>
  formatPrice(
    value,
    currency && currency.trim() ? currency : DEFAULT_CURRENCY,
    DEFAULT_LOCALE,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );

const timeframeOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "14days", label: "Last 14 Days" },
  { value: "month", label: "This Month" },
] as const;

type Timeframe = (typeof timeframeOptions)[number]["value"];

export function AnalyticsView({ onBack }: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fnError } = await supabase.functions.invoke(
          "analytics-data",
          { body: { timeframe } },
        );

        if (fnError) {
          throw fnError;
        }

        if (!isMounted) return;
        setAnalytics(data as AnalyticsData);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading analytics data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load analytics data",
        );
        setAnalytics(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [timeframe, refreshKey]);

  const packageStats = useMemo(() => {
    if (!analytics) {
      return { totalSales: 0, totalRevenue: 0, avgRevenue: 0 };
    }
    const totalSales = analytics.package_performance.reduce(
      (sum, pkg) => sum + (pkg.sales ?? 0),
      0,
    );
    const totalRevenue = analytics.total_revenue ?? 0;
    return {
      totalSales,
      totalRevenue,
      avgRevenue: totalSales > 0 ? totalRevenue / totalSales : 0,
    };
  }, [analytics]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const renderSkeleton = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={`analytics-skeleton-${index}`}
            className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg"
          >
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-1/2 mt-4" />
            <Skeleton className="h-4 w-1/3 mt-2" />
          </Card>
        ))}
      </div>
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <Skeleton className="h-64 w-full" />
      </Card>
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <Skeleton className="h-32 w-full" />
      </Card>
    </>
  );

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Revenue Analytics"
        description="Track revenue performance and package analytics"
        onBack={onBack}
        actions={
          <div className="flex items-center gap-2">
            {timeframeOptions.map((option) => (
              <Button
                key={option.value}
                variant={option.value === timeframe ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh analytics"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading
        ? (
          renderSkeleton()
        )
        : analytics
        ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">Total revenue</p>
                  <p className="text-2xl font-bold text-green-500">
                    {formatCurrency(
                      packageStats.totalRevenue,
                      analytics.currency,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Timeframe:{" "}
                    {timeframeOptions.find((t) => t.value === timeframe)?.label}
                  </p>
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">Packages sold</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {packageStats.totalSales}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Across active plans
                  </p>
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Avg revenue per sale
                  </p>
                  <p className="text-2xl font-bold text-purple-500">
                    {formatCurrency(
                      packageStats.avgRevenue,
                      analytics.currency,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Based on completed sales
                  </p>
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Pending payments
                  </p>
                  <p className="text-2xl font-bold text-telegram">
                    {analytics.pending_payments ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Awaiting completion
                  </p>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Audience overview</h3>
                  <p className="text-sm text-muted-foreground">
                    Snapshot generated at{" "}
                    {formatIsoDateTime(analytics.generated_at ?? new Date())}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      {analytics.total_users ?? 0} total users
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">
                      {analytics.vip_users ?? 0} VIP members
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">
                      {analytics.package_performance.length} active plans
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">
                Package performance
              </h3>
              <div className="space-y-4">
                {analytics.package_performance.length === 0
                  ? (
                    <p className="text-sm text-muted-foreground">
                      No package performance data available for this timeframe.
                    </p>
                  )
                  : (
                    analytics.package_performance.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background/40 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <h4 className="font-semibold">{pkg.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {pkg.sales} sale{pkg.sales === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>
                            Revenue: {formatCurrency(pkg.revenue, pkg.currency)}
                          </span>
                          <span>
                            Avg sale: {formatCurrency(
                              pkg.sales > 0 ? pkg.revenue / pkg.sales : 0,
                              pkg.currency,
                            )}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Analytics actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Export revenue report
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Package className="w-4 h-4" />
                  Package performance report
                </Button>
                <Button variant="default" size="sm" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Share with team
                </Button>
              </div>
            </Card>
          </>
        )
        : (
          <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg text-center">
            <p className="text-muted-foreground">
              No analytics data available for the selected timeframe.
            </p>
          </Card>
        )}
    </div>
  );
}
