"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionCard } from "@/components/ui/motion-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Clock, Crown, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { callEdgeFunction } from "@/config/supabase";
import { formatIsoDate } from "@/utils/isoFormat";

interface SubscriptionStatus {
  is_vip: boolean;
  plan_name: string | null;
  subscription_end_date: string | null;
  days_remaining: number | null;
  payment_status: string | null;
  is_expired: boolean;
}

interface SubscriptionStatusCardProps {
  telegramUserId?: string;
  telegramData?: any;
  onUpgrade?: () => void;
}

export const SubscriptionStatusCard = ({
  telegramUserId,
  telegramData,
  onUpgrade,
}: SubscriptionStatusCardProps) => {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Extract telegram user ID from multiple sources
  const getUserId = useCallback(() => {
    if (telegramUserId) return telegramUserId;
    if (telegramData?.user?.id) return telegramData.user.id.toString();
    return null;
  }, [telegramUserId, telegramData]);

  const fetchSubscriptionStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await callEdgeFunction<SubscriptionStatus>(
        "SUBSCRIPTION_STATUS",
        {
          method: "POST",
          body: { telegram_user_id: userId },
        },
      );
      if (error) {
        throw new Error(error.message);
      }
      setStatus(data as SubscriptionStatus);
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      fetchSubscriptionStatus(userId);
    } else {
      setLoading(false);
    }
  }, [getUserId, fetchSubscriptionStatus]);

  const formatDate = (dateString: string) => {
    return formatIsoDate(dateString);
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (!status.is_vip) {
      return <Badge variant="outline">Free</Badge>;
    }

    if (status.is_expired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    if (status.payment_status === "pending") {
      return <Badge variant="secondary">Pending</Badge>;
    }

    return (
      <Badge className="bg-primary text-primary-foreground">VIP Active</Badge>
    );
  };

  if (loading) {
    return (
      <MotionCard variant="glass" animate={true}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </MotionCard>
    );
  }

  const currentUserId = getUserId();

  if (!currentUserId) {
    return (
      <MotionCard variant="glass" animate={true}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Connect your Telegram account to view subscription status
          </p>
        </CardContent>
      </MotionCard>
    );
  }

  return (
    <MotionCard
      variant="glass"
      hover={true}
      animate={true}
      className="border-primary/20 shadow-lg"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary animate-pulse-glow" />
            <span className="text-lg font-bold">Subscription Status</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.is_vip
          ? (
            <div className="space-tight">
              <div className="ui-flex-between">
                <span className="text-body-sm font-medium">Plan:</span>
                <span className="text-body-sm">
                  {status.plan_name || "VIP"}
                </span>
              </div>

              {status.subscription_end_date && (
                <div className="ui-flex-between">
                  <span className="text-body-sm font-medium">Expires:</span>
                  <span className="text-body-sm">
                    {formatDate(status.subscription_end_date)}
                  </span>
                </div>
              )}

              {status.days_remaining !== null && (
                <div className="ui-flex-between">
                  <span className="text-body-sm font-medium">
                    Days remaining:
                  </span>
                  <span
                    className={`text-body-sm font-medium ${
                      status.days_remaining <= 7
                        ? "text-destructive"
                        : "text-primary"
                    }`}
                  >
                    {status.days_remaining}
                  </span>
                </div>
              )}

              {status.payment_status && (
                <div className="ui-flex-between">
                  <span className="text-body-sm font-medium">Payment:</span>
                  <div className="flex items-center gap-1">
                    {status.payment_status === "completed"
                      ? <CheckCircle className="icon-sm text-success" />
                      : <XCircle className="icon-sm text-warning" />}
                    <span className="text-body-sm capitalize">
                      {status.payment_status}
                    </span>
                  </div>
                </div>
              )}

              {status.is_expired && (
                <div className="mt-4 p-3 status-error rounded-lg">
                  <p className="text-body-sm">
                    Your subscription has expired. Renew now to continue
                    enjoying VIP benefits.
                  </p>
                </div>
              )}
            </div>
          )
          : (
            <div className="text-center py-6 bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg">
              <Crown className="w-16 h-16 text-primary mx-auto mb-4 animate-float" />
              <h3 className="text-lg font-bold mb-2">No Active Subscription</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed px-4">
                Join our VIP community and unlock premium trading signals,
                market analysis, and exclusive content.
              </p>
              <Button
                onClick={onUpgrade}
                size="lg"
                className="w-full max-w-xs mx-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold animate-pulse-glow"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to VIP
              </Button>
            </div>
          )}

        {status?.is_vip &&
          (status.days_remaining === null || status.days_remaining > 0) &&
          !status.is_expired && (
          <div className="flex items-center gap-2 text-caption">
            <CheckCircle className="icon-xs text-success" />
            <span>VIP benefits active</span>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
};
