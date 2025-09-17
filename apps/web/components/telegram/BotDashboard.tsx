"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { AdminView } from "./dashboard/AdminView";
import { AnalyticsView } from "./dashboard/AnalyticsView";
import { ConfigView } from "./dashboard/ConfigView";
import { PackagesView } from "./dashboard/PackagesView";
import { PromosView } from "./dashboard/PromosView";
import { SupportView } from "./dashboard/SupportView";
import { WelcomeView } from "./dashboard/WelcomeView";
import type { DashboardStats, DashboardViewKey } from "./dashboard/types";

const DEFAULT_STATS: DashboardStats = {
  totalUsers: 0,
  vipMembers: 0,
  totalRevenue: 0,
  pendingPayments: 0,
  lastUpdated: "",
};

const BotDashboard = () => {
  const [currentView, setCurrentView] = useState<DashboardViewKey>("welcome");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const { toast } = useToast();

  useEffect(() => {
    fetchBotStats();
    checkBotStatus();
  }, []);

  const fetchBotStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("analytics-data");

      if (error) throw error;

      setStats({
        totalUsers: data?.total_users || 0,
        vipMembers: data?.vip_users || 0,
        totalRevenue: data?.total_revenue || 0,
        pendingPayments: data?.pending_payments || 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching bot stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkBotStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("test-bot-status");
      setIsConnected(!error && data?.bot_status?.includes("✅"));
    } catch (error) {
      console.error("Error checking bot status:", error);
      setIsConnected(false);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "config":
        return <ConfigView onBack={() => setCurrentView("welcome")} />;
      case "packages":
        return <PackagesView onBack={() => setCurrentView("welcome")} />;
      case "support":
        return <SupportView onBack={() => setCurrentView("welcome")} />;
      case "analytics":
        return <AnalyticsView onBack={() => setCurrentView("welcome")} />;
      case "promos":
        return (
          <PromosView
            onBack={() => setCurrentView("welcome")}
            onCopyPromo={(code) =>
              toast({ description: `Promo code ${code} copied` })
            }
          />
        );
      case "admin":
        return <AdminView onBack={() => setCurrentView("welcome")} />;
      case "welcome":
      default:
        return (
          <WelcomeView
            stats={stats}
            loading={loading}
            isConnected={isConnected}
            onNavigate={setCurrentView}
            onRefreshStats={fetchBotStats}
            onCheckStatus={checkBotStatus}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10 p-6">
      <div className="max-w-7xl mx-auto">{renderView()}</div>
    </div>
  );
};

export default BotDashboard;
