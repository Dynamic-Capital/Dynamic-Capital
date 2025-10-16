"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { MotionCard } from "@/components/ui/motion-card";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { cardVariants } from "@/lib/motion-variants";
import { toast } from "sonner";
import { callEdgeFunction } from "@/config/supabase";

interface SubscriptionStatus {
  is_vip: boolean;
  plan_name: string | null;
  subscription_end_date: string | null;
  days_remaining: number | null;
  payment_status: string | null;
  is_expired: boolean;
}

interface StatusSectionProps {
  telegramData: any;
}

export default function StatusSection({ telegramData }: StatusSectionProps) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isInTelegram = typeof window !== "undefined" && window.Telegram?.WebApp;

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!isInTelegram || !telegramData?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, status } = await callEdgeFunction("SUBSCRIPTION_STATUS", {
        method: "POST",
        body: { telegram_id: telegramData.user.id },
      });

      if (status !== 200 || !data) {
        throw new Error("Failed to fetch subscription status");
      }

      setSubscription(data as SubscriptionStatus);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      toast.error("Failed to load subscription status");
    } finally {
      setLoading(false);
    }
  }, [isInTelegram, telegramData?.user?.id]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionStatus();
    setRefreshing(false);
    toast.success("Status refreshed");
  };

  const getStatusBadge = () => {
    if (!subscription) {
      return (
        <Badge
          variant="outline"
          className="bg-gray-500/10 text-gray-600 border-gray-500/30"
        >
          Not Connected
        </Badge>
      );
    }

    if (subscription.is_expired) {
      return (
        <Badge
          variant="destructive"
          className="bg-dc-brand/10 text-dc-brand-dark border-dc-brand/30"
        >
          Expired
        </Badge>
      );
    }

    if (subscription.is_vip) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-500/30">
          VIP Active
        </Badge>
      );
    }

    if (subscription.payment_status === "pending") {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
        >
          Payment Pending
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="bg-blue-500/10 text-blue-600 border-blue-500/30"
      >
        Free
      </Badge>
    );
  };

  const getStatusIcon = () => {
    if (!subscription) return <AlertCircle className="h-5 w-5 text-gray-500" />;
    if (subscription.is_expired) {
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
    if (subscription.is_vip) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (subscription.payment_status === "pending") {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
    return <Users className="h-5 w-5 text-blue-500" />;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysRemainingColor = (days: number | null) => {
    if (!days) return "text-muted-foreground";
    if (days <= 7) return "text-destructive";
    if (days <= 30) return "text-yellow-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <FadeInOnView>
        <div className="flex flex-col gap-6">
          <MotionCard variant="glass" className="border-primary/20">
            <CardContent className="flex items-center justify-center gap-3 p-4 sm:p-6">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading status...
              </span>
            </CardContent>
          </MotionCard>
        </div>
      </FadeInOnView>
    );
  }

  return (
    <FadeInOnView>
      <div className="flex flex-col gap-6">
        {/* Main Status Card */}
        <MotionCard variant="glass" className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                  <CardDescription>
                    Your current subscription status
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="hover:bg-accent"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">
                Connection:
              </span>
              {isInTelegram
                ? (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-600 border-green-500/30"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )
                : (
                  <Badge
                    variant="outline"
                    className="bg-orange-500/10 text-orange-600 border-orange-500/30"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Web Browser
                  </Badge>
                )}
            </div>

            {/* Subscription Status */}
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground">
                Status:
              </span>
              {getStatusBadge()}
            </div>

            {subscription && (
              <>
                {/* Plan Details */}
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">
                    Plan:
                  </span>
                  <span className="text-sm font-medium">
                    {subscription.plan_name || "No active plan"}
                  </span>
                </div>

                {/* Expiry Date */}
                {subscription.subscription_end_date && (
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">
                      Expires:
                    </span>
                    <span className="text-sm font-medium">
                      {formatDate(subscription.subscription_end_date)}
                    </span>
                  </div>
                )}

                {/* Days Remaining */}
                {subscription.days_remaining !== null && (
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">
                      Days remaining:
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        getDaysRemainingColor(subscription.days_remaining)
                      }`}
                    >
                      {subscription.days_remaining} days
                    </span>
                  </div>
                )}

                {/* Payment Status */}
                {subscription.payment_status && (
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">
                      Payment:
                    </span>
                    <Badge
                      variant={subscription.payment_status === "completed"
                        ? "default"
                        : "secondary"}
                      className={subscription.payment_status === "completed"
                        ? "bg-green-500/10 text-green-600 border-green-500/30"
                        : subscription.payment_status === "pending"
                        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                        : "bg-dc-brand/10 text-dc-brand-dark border-dc-brand/30"}
                    >
                      {subscription.payment_status}
                    </Badge>
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {(!subscription?.is_vip || subscription?.is_expired) && (
                <Button
                  size="sm"
                  responsive
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", "plan");
                    window.history.pushState({}, "", url.toString());
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                  className="touch-target flex-1"
                >
                  <Star className="h-4 w-4 mr-2" />
                  {subscription?.is_expired ? "Renew Plan" : "Upgrade Now"}
                </Button>
              )}

              {isInTelegram && (
                <Button
                  variant="outline"
                  size="sm"
                  responsive
                  onClick={() => {
                    window.open(
                      "https://t.me/DynamicCapital_Support",
                      "_blank",
                    );
                  }}
                  className="touch-target flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Support
                </Button>
              )}
            </div>
          </CardContent>
        </MotionCard>

        {/* Web User Notice */}
        {!isInTelegram && (
          <Alert className="border-blue-500/20 bg-blue-500/10">
            <ExternalLink className="h-4 w-4" />
            <AlertDescription className="text-blue-600">
              💡 For real-time subscription status and payments,{" "}
              <a
                href="https://t.me/DynamicCapital_Support"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                open in Telegram
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Tips */}
        {subscription?.is_vip && (
          <MotionCard variant="glow" className="border-green-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                VIP Benefits Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Priority trading signals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>VIP chat access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Daily market analysis</span>
                </div>
              </div>
            </CardContent>
          </MotionCard>
        )}
      </div>
    </FadeInOnView>
  );
}
