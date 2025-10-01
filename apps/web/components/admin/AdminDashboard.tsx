"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  CheckCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useSupabase } from "@/context/SupabaseProvider";
import { AdminGate } from "./AdminGate";
import { AdminLogs } from "./AdminLogs";
import { AdminBans } from "./AdminBans";
import { BroadcastManager } from "./BroadcastManager";
import { BotDiagnostics } from "./BotDiagnostics";
import { callEdgeFunction } from "@/config/supabase";
import { formatIsoDateTime } from "@/utils/isoFormat";
import { DynamicButton, DynamicContainer } from "@/components/dynamic-ui";

const AdminDashboardSkeleton = () => {
  return (
    <section
      className="relative overflow-hidden rounded-[32px] border border-border/40 bg-gradient-to-br from-background via-card/40 to-background p-[1px] shadow-xl"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-br from-primary/20 via-transparent to-dc-accent/20 opacity-40" />
      <div className="relative rounded-[32px] bg-background/95 p-6 sm:p-10">
        <DynamicContainer variant="slideUp" className="space-y-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3 text-left">
              <Skeleton height="l" width="xl" />
              <Skeleton height="xl" width="xl" className="max-w-[18rem]" />
              <Skeleton height="s" width="xl" />
              <Skeleton height="s" width="l" />
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Skeleton height="s" width="m" />
              <Skeleton height="s" width="s" />
            </div>
          </header>

          <div className="space-y-6">
            <div className="space-y-6 rounded-3xl border border-border/40 bg-card/70 p-6 shadow-inner">
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <Skeleton height="s" width="l" />
                <Skeleton height="s" width="m" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="space-y-4 rounded-2xl border border-border/30 bg-background/80 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton shape="circle" width="m" />
                      <Skeleton height="xs" width="s" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton height="s" width="l" />
                      <Skeleton height="s" width="m" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 rounded-3xl border border-border/40 bg-card/70 p-6 shadow-inner">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    shape="block"
                    height="m"
                    className="rounded-xl"
                  />
                ))}
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-2xl border border-border/30 bg-background/80 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-1 items-center gap-3">
                        <Skeleton
                          shape="circle"
                          width="m"
                          className="shrink-0"
                        />
                        <div className="w-full space-y-2">
                          <Skeleton
                            height="s"
                            width="l"
                            className="max-w-[14rem]"
                          />
                          <Skeleton
                            height="s"
                            width="m"
                            className="max-w-[10rem]"
                          />
                        </div>
                      </div>
                      <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
                        <Skeleton height="s" width="s" />
                        <Skeleton
                          shape="block"
                          height="m"
                          width="m"
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DynamicContainer>
      </div>
    </section>
  );
};

interface AdminStats {
  total_users: number;
  vip_users: number;
  admin_users: number;
  pending_payments: number;
  completed_payments: number;
  total_revenue: number;
  daily_interactions: number;
  daily_sessions: number;
  last_updated: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  currency: string;
  telegram_user_id: string;
  created_at: string;
  status: string;
}

interface AdminDashboardProps {
  telegramData?: any;
}

export const AdminDashboard = ({ telegramData }: AdminDashboardProps) => {
  const { supabase } = useSupabase();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { telegramUser, getAdminAuth } = useTelegramAuth();

  const getUserId = () => {
    return telegramUser?.id?.toString() || telegramData?.user?.id?.toString() ||
      null;
  };

  const checkAdminAccess = useCallback(async () => {
    try {
      // Check if user is admin via Telegram data
      if (telegramData?.user?.id) {
        const adminIds = ["123456789", "987654321"]; // Replace with actual admin IDs
        if (adminIds.includes(telegramData.user.id.toString())) {
          return true;
        }
      }

      // Check if user is admin via Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single<{ role: string | null }>();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          return false;
        }

        return profile?.role === "admin";
      }

      return false;
    } catch (error) {
      console.error("Admin access check error:", error);
      return false;
    }
  }, [telegramData, supabase]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      // Load admin stats
      const { data: statsData, error: statsError } = await callEdgeFunction<
        AdminStats
      >("ANALYTICS_DATA", {
        method: "POST",
        headers: {
          ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
          timeframe: "today",
        },
      });

      if (statsError) {
        throw new Error(statsError.message);
      }

      if (statsData) {
        setStats(statsData as AdminStats);
      }

      // Load pending payments
      const { data: paymentsData, error: paymentsError } =
        await callEdgeFunction("ADMIN_LIST_PENDING", {
          method: "POST",
          headers: {
            ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
          },
          body: {
            ...(auth.initData ? { initData: auth.initData } : {}),
            limit: 20,
            offset: 0,
          },
        });

      if (paymentsError) {
        throw new Error(paymentsError.message);
      }

      if (paymentsData) {
        setPendingPayments((paymentsData as any).items || []);
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [checkAdminAccess, getAdminAuth, toast]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData, telegramData, supabase]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user && !telegramData) {
          loadAdminData();
        }
      },
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadAdminData, telegramData, supabase]);

  const handlePaymentAction = async (
    paymentId: string,
    decision: "approve" | "reject",
  ) => {
    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callEdgeFunction("ADMIN_ACT_ON_PAYMENT", {
        method: "POST",
        headers: {
          ...(auth.token ? { "Authorization": `Bearer ${auth.token}` } : {}),
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
          payment_id: paymentId,
          decision: decision,
          message: `Payment ${decision}d by admin`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.ok) {
        toast({
          title: "Success",
          description: `Payment ${decision}d successfully`,
        });

        // Refresh pending payments
        await loadAdminData();
      } else {
        throw new Error(
          (data as any)?.error || `Failed to ${decision} payment`,
        );
      }
    } catch (error) {
      console.error(`Failed to ${decision} payment:`, error);
      toast({
        title: "Error",
        description: `Failed to ${decision} payment`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (!isAdmin) {
    return (
      <DynamicContainer
        variant="slideUp"
        className="rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-lg"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-foreground">
          Access denied
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          You don't have admin privileges to access this dashboard. Contact the
          Dynamic Capital team if you believe this is an error.
        </p>
      </DynamicContainer>
    );
  }

  const adminName = telegramUser?.first_name || "Admin";
  const formattedLastUpdated = stats?.last_updated
    ? formatIsoDateTime(stats.last_updated)
    : "Awaiting sync";
  const overviewItems = stats
    ? [
      {
        label: "Total users",
        value: stats.total_users.toLocaleString(),
        hint: `${stats.vip_users.toLocaleString()} VIP members`,
        icon: Users,
        accent: "text-primary",
      },
      {
        label: "Revenue",
        value: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(stats.total_revenue ?? 0),
        hint: `${stats.completed_payments.toLocaleString()} payments settled`,
        icon: DollarSign,
        accent: "text-success",
      },
      {
        label: "Pending reviews",
        value: stats.pending_payments.toLocaleString(),
        hint: "Awaiting manual decision",
        icon: Clock,
        accent: "text-warning",
      },
      {
        label: "Daily activity",
        value: stats.daily_interactions.toLocaleString(),
        hint: `${stats.daily_sessions.toLocaleString()} sessions today`,
        icon: Activity,
        accent: "text-info",
      },
    ]
    : [];
  const pendingCount = pendingPayments.length;

  return (
    <AdminGate>
      <section className="relative overflow-hidden rounded-[32px] border border-border/40 bg-gradient-to-br from-background via-card/40 to-background p-[1px] shadow-xl">
        <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-br from-primary/20 via-transparent to-dc-accent/20 opacity-40" />
        <div className="relative rounded-[32px] bg-background/95 p-6 sm:p-10">
          <DynamicContainer variant="slideUp" className="space-y-10">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2 text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  Dynamic GUI admin cockpit
                </span>
                <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                  Dynamic Capital operations
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back,{" "}
                  {adminName}. Review deposits, broadcast updates, and inspect
                  bot health without leaving the Dynamic GUI workspace.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Badge variant="outline">
                  Last sync {formattedLastUpdated}
                </Badge>
                <Badge variant="default">
                  {pendingCount} pending reviews
                </Badge>
              </div>
            </header>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid grid-cols-2 gap-2 rounded-2xl border border-border/40 bg-card/60 p-2 md:grid-cols-6">
                <TabsTrigger
                  value="overview"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Payments
                </TabsTrigger>
                <TabsTrigger
                  value="logs"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Logs
                </TabsTrigger>
                <TabsTrigger
                  value="bans"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Bans
                </TabsTrigger>
                <TabsTrigger
                  value="broadcast"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Broadcast
                </TabsTrigger>
                <TabsTrigger
                  value="bot"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Bot
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="overview"
                className="space-y-6 rounded-3xl border border-border/40 bg-card/70 p-6 shadow-inner"
              >
                <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Monitor realtime metrics across the Dynamic Capital stack
                    with Dynamic GUI automation.
                  </p>
                  <Badge
                    variant="outline"
                    className="border-border/60 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Synced {formattedLastUpdated}
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {overviewItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/85 p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Icon
                              className={`h-5 w-5 ${item.accent}`}
                              aria-hidden="true"
                            />
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {item.label}
                          </span>
                        </div>
                        <div
                          className={`text-2xl font-semibold ${item.accent}`}
                        >
                          {item.value}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.hint}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent
                value="payments"
                className="space-y-6 rounded-3xl border border-border/40 bg-card/70 p-6 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      Pending payments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Approve or reject submissions in-line. All actions are
                      logged for compliance.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-primary/40 bg-primary/10 text-primary"
                  >
                    {pendingCount} awaiting review
                  </Badge>
                </div>

                {pendingCount === 0
                  ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/40 bg-background/85 py-12 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                      All caught up! New submissions will appear here instantly.
                    </div>
                  )
                  : (
                    <div className="space-y-4">
                      {pendingPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-background/85 p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-foreground">
                              ${payment.amount} {payment.currency}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1">
                                User {payment.telegram_user_id}
                              </span>
                              <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1">
                                {formatIsoDateTime(payment.created_at)}
                              </span>
                              <span className="rounded-full border border-border/60 bg-card/60 px-3 py-1">
                                Status: {payment.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <DynamicButton
                              size="small"
                              onClick={() =>
                                handlePaymentAction(payment.id, "approve")}
                              className="bg-success text-success-foreground hover:bg-success/90"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </DynamicButton>
                            <DynamicButton
                              size="small"
                              variant="outline"
                              onClick={() =>
                                handlePaymentAction(payment.id, "reject")}
                              className="border-destructive/60 text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Reject
                            </DynamicButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>

              <TabsContent
                value="logs"
                className="rounded-3xl border border-border/40 bg-card/70 p-6 shadow-sm"
              >
                <AdminLogs />
              </TabsContent>

              <TabsContent
                value="bans"
                className="rounded-3xl border border-border/40 bg-card/70 p-6 shadow-sm"
              >
                <AdminBans />
              </TabsContent>

              <TabsContent
                value="broadcast"
                className="rounded-3xl border border-border/40 bg-card/70 p-6 shadow-sm"
              >
                <BroadcastManager />
              </TabsContent>

              <TabsContent
                value="bot"
                className="rounded-3xl border border-border/40 bg-card/70 p-6 shadow-sm"
              >
                <BotDiagnostics />
              </TabsContent>
            </Tabs>
          </DynamicContainer>
        </div>
      </section>
    </AdminGate>
  );
};
