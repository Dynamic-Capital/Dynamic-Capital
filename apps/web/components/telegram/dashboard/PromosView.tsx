"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, Copy, Gift, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Promotion } from "./types";
import { ViewHeader } from "./ViewHeader";

interface PromosViewProps {
  onBack: () => void;
  onCopyPromo: (code: string) => void;
}

const toCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const parseDate = (value?: string | null) => value ? new Date(value) : null;

const normalizePromo = (promo: Promotion): Promotion => ({
  ...promo,
  discount_type: promo.discount_type?.toLowerCase() ?? null,
  discount_value: typeof promo.discount_value === "number"
    ? promo.discount_value
    : Number(promo.discount_value ?? 0),
  max_uses: promo.max_uses !== null && promo.max_uses !== undefined
    ? Number(promo.max_uses)
    : null,
  usage_count: promo.usage_count !== null && promo.usage_count !== undefined
    ? Number(promo.usage_count)
    : null,
});

const formatDiscount = (promo: Promotion) => {
  if (promo.discount_type === "percentage") {
    return `${promo.discount_value ?? 0}%`;
  }
  if (promo.discount_type === "fixed") {
    return toCurrency(promo.discount_value ?? 0);
  }
  return promo.discount_value ? `${promo.discount_value}` : "—";
};

const daysUntil = (promo: Promotion) => {
  const expiresAt = parseDate(promo.valid_until);
  if (!expiresAt) return null;
  const diff = expiresAt.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export function PromosView({ onBack, onCopyPromo }: PromosViewProps) {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPromos = async () => {
      try {
        setLoading(true);
        const { data, error: fnError } = await supabase.functions.invoke(
          "active-promos",
          { method: "GET" },
        );

        if (fnError) {
          throw fnError;
        }

        const fetchedPromos = Array.isArray(data?.promotions)
          ? (data?.promotions as Promotion[])
          : [];

        if (!isMounted) return;
        setPromos(fetchedPromos.map(normalizePromo));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading promotions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load promotions",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPromos();
    return () => {
      isMounted = false;
    };
  }, []);

  const highlightPromo = useMemo(() => {
    if (promos.length === 0) return null;
    return [...promos].sort((a, b) => {
      const aDate = parseDate(a.valid_until)?.getTime() ?? Infinity;
      const bDate = parseDate(b.valid_until)?.getTime() ?? Infinity;
      return aDate - bDate;
    })[0];
  }, [promos]);

  const stats = useMemo(() => {
    if (promos.length === 0) {
      return {
        active: 0,
        expiringSoon: 0,
        highestDiscount: "—",
      };
    }

    const expiringSoon = promos.filter((promo) => {
      const days = daysUntil(promo);
      return days !== null && days <= 7 && days >= 0;
    }).length;

    const highest = promos.reduce<Promotion | null>((best, current) => {
      if (!best) return current;
      if ((current.discount_value ?? 0) > (best.discount_value ?? 0)) {
        return current;
      }
      return best;
    }, null);

    return {
      active: promos.length,
      expiringSoon,
      highestDiscount: highest ? formatDiscount(highest) : "—",
    };
  }, [promos]);

  const handleCopy = async (code: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
    } catch (copyError) {
      console.error("Failed to copy promo code:", copyError);
    } finally {
      onCopyPromo(code);
    }
  };

  const renderSkeleton = () => (
    <>
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg border-l-4 border-l-green-500">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </Card>
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`promo-skeleton-${index}`}
              className="flex items-center gap-4"
            >
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={`promo-stat-${index}`}
              className="h-24 w-full rounded-lg"
            />
          ))}
        </div>
      </Card>
    </>
  );

  const renderPromos = () => {
    if (promos.length === 0) {
      return (
        <Card className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg text-center">
          <h3 className="text-xl font-semibold mb-2">No active promotions</h3>
          <p className="text-muted-foreground">
            Create a promo code in Supabase to make it available here and
            through the Telegram bot.
          </p>
        </Card>
      );
    }

    return (
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">All Promo Codes</h3>
        </div>
        <div className="space-y-4">
          {promos.map((promo) => {
            const days = daysUntil(promo);
            const expiresLabel = promo.valid_until
              ? new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(parseDate(promo.valid_until)!)
              : "No expiry";
            const statusLabel = days === null
              ? "Active"
              : days < 0
              ? "Expired"
              : days <= 7
              ? "Expiring Soon"
              : "Active";
            return (
              <div
                key={promo.code}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Gift className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono font-semibold">{promo.code}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label={`Copy promo code ${promo.code}`}
                        title="Copy code"
                        onClick={() => handleCopy(promo.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Badge
                        variant="outline"
                        className={statusLabel === "Active"
                          ? "border-green-500 text-green-600"
                          : statusLabel === "Expiring Soon"
                          ? "border-orange-500 text-orange-600"
                          : "border-destructive text-destructive"}
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {promo.description || "No description provided."}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Discount: {formatDiscount(promo)}</span>
                      <span>Expires: {expiresLabel}</span>
                      {promo.max_uses !== null && promo.usage_count !== null &&
                        (
                          <span>
                            Usage: {promo.usage_count}/{promo.max_uses}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-dc-brand-dark hover:text-dc-brand-dark"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderHighlight = () => {
    if (!highlightPromo) return null;
    const days = daysUntil(highlightPromo);
    const expiresLabel = highlightPromo.valid_until
      ? new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(parseDate(highlightPromo.valid_until)!)
      : "No expiry";
    return (
      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg border-l-4 border-l-green-500">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Gift className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-600">
                {highlightPromo.code}
              </h3>
              <p className="text-muted-foreground">
                {highlightPromo.description || "Active promotion"}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Badge className="bg-green-500 text-white">ACTIVE</Badge>
                </span>
                <span className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  {days !== null && days >= 0
                    ? `Expires in ${days} day${days === 1 ? "" : "s"}`
                    : "Expires soon"}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="w-4 h-4" />
                  {expiresLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button variant="destructive" size="sm">
              Disable
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Promo Codes Management"
        description="Create and manage discount codes for your users"
        onBack={onBack}
        actions={
          <Button variant="default" className="gap-2">
            <Gift className="w-4 h-4" />
            Create New Promo
          </Button>
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
        : (
          <>
            {renderHighlight()}
            {renderPromos()}
            <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Promo Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">
                    {stats.active}
                  </p>
                  <p className="text-sm text-muted-foreground">Active codes</p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">
                    {stats.expiringSoon}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expiring within 7 days
                  </p>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-500">
                    {stats.highestDiscount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Top discount available
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
    </div>
  );
}
