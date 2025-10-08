import { MarketSnapshotBoard } from "@/components/market/MarketSnapshotBoard";
import { QuadrantChart } from "@/components/trading/QuadrantChart";
import { useMarketSnapshot } from "@/hooks/useMarketSnapshot";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { AlertCircle, Pause, RefreshCcw, Wifi } from "lucide-react";
import { useMemo, useState } from "react";

const REFRESH_INTERVAL_MS = 30_000;

export function SnapshotSection() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const {
    categories,
    updatedAt,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useMarketSnapshot({
    autoRefresh,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
  });

  const statusBadge = autoRefresh
    ? (
      <Badge variant="success" className="flex items-center gap-2">
        <Wifi className="h-3.5 w-3.5" /> Live feed
      </Badge>
    )
    : (
      <Badge variant="warning" className="flex items-center gap-2">
        <Pause className="h-3.5 w-3.5" /> Paused
      </Badge>
    );

  const timestampLabel = useMemo(() => {
    if (!updatedAt) {
      return "Awaiting first sync";
    }

    const date = new Date(updatedAt);
    return `Synced ${
      date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    } at ${
      date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    }`;
  }, [updatedAt]);

  return (
    <section id="snapshot" className="py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Dynamic Market Snapshot
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor currencies, commodities, global indices, and
              cryptocurrencies with live pricing streams sourced from
              AwesomeAPI, Stooq, and CoinGecko.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {statusBadge}
              <span>{timestampLabel}</span>
              <span>
                {`Refresh cadence · ${
                  Math.round(REFRESH_INTERVAL_MS / 1000)
                }s (2m when inactive)`}
              </span>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-4 rounded-xl border border-border/60 bg-background/70 p-5 shadow-lg shadow-primary/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Auto refresh</p>
                <p className="text-xs text-muted-foreground">
                  Pull new candles without leaving the page.
                </p>
              </div>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
            <Button
              variant="outline"
              className={cn("w-full gap-2", isRefreshing && "animate-pulse")}
              onClick={refresh}
              disabled={isRefreshing}
            >
              <RefreshCcw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
              {isRefreshing ? "Syncing" : "Sync now"}
            </Button>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <MarketSnapshotBoard
            categories={categories}
            updatedAt={updatedAt}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            error={error}
            onRefresh={refresh}
          />

          <div className="space-y-6">
            <QuadrantChart />

            <Card>
              <CardHeader className="gap-3">
                <CardTitle as="div" className="text-lg">
                  Replay timeline
                </CardTitle>
                <CardDescription>
                  Track the last moves across SMA overlays to contextualize
                  intraday volatility before executing.
                </CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    20 SMA
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-secondary" />
                    5 SMA
                  </div>
                </div>
                <div className="relative">
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
                    <span>T-2h</span>
                    <span>T-1h</span>
                    <span>Now</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SnapshotPage() {
  return (
    <div className="min-h-screen bg-background">
      <SnapshotSection />
    </div>
  );
}
