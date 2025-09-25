import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DashboardStats, NavigateToView } from "./types";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BotIcon,
  CreditCard,
  FileText,
  Gift,
  HeadphonesIcon,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Users,
} from "lucide-react";

interface WelcomeViewProps {
  stats: DashboardStats;
  loading: boolean;
  isConnected: boolean;
  onNavigate: NavigateToView;
  onRefreshStats: () => void;
  onCheckStatus: () => void;
}

export function WelcomeView({
  stats,
  loading,
  isConnected,
  onNavigate,
  onRefreshStats,
  onCheckStatus,
}: WelcomeViewProps) {
  return (
    <div className="space-y-8">
      {!isConnected && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            Bot appears to be offline. Please ensure TELEGRAM_WEBHOOK_SECRET is
            configured in your Supabase secrets.
          </AlertDescription>
        </Alert>
      )}

      <div className="text-center space-y-6">
        <div className="relative">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-telegram rounded-3xl shadow-telegram transition-transform hover:scale-105 cursor-pointer">
            <BotIcon className="w-12 h-12 text-white animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background animate-pulse" />
        </div>
        <div>
          <h1 className="text-5xl font-bold bg-gradient-telegram bg-clip-text text-transparent mb-3 animate-fade-in">
            Dynamic Capital Bot
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
            Your premium Telegram bot for subscription management, payments, and
            customer support with AI-powered assistance
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-card border-0 shadow-telegram hover:shadow-xl transition-all duration-300 hover:scale-105 group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-telegram/10 rounded-xl group-hover:bg-telegram/20 transition-colors">
              <Activity className="w-6 h-6 text-telegram" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Bot Status
              </p>
              <div className="mt-2">
                {loading
                  ? (
                    <Badge
                      variant="outline"
                      className="border-muted-foreground/20 text-muted-foreground animate-pulse"
                    >
                      Loading...
                    </Badge>
                  )
                  : isConnected
                  ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 animate-fade-in">
                      ✅ Online
                    </Badge>
                  )
                  : (
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 animate-fade-in">
                      ⚠️ Offline
                    </Badge>
                  )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-card border-0 shadow-telegram hover:shadow-xl transition-all duration-300 hover:scale-105 group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Users
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {loading
                  ? <span className="animate-pulse">...</span>
                  : (
                    <span className="animate-fade-in">
                      {stats.totalUsers.toLocaleString()}
                    </span>
                  )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-card border-0 shadow-telegram hover:shadow-xl transition-all duration-300 hover:scale-105 group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
              <CreditCard className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                VIP Members
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {loading
                  ? <span className="animate-pulse">...</span>
                  : (
                    <span className="animate-fade-in">
                      {stats.vipMembers.toLocaleString()}
                    </span>
                  )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-card border-0 shadow-telegram hover:shadow-xl transition-all duration-300 hover:scale-105 group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
              <BarChart3 className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {loading
                  ? <span className="animate-pulse">...</span>
                  : (
                    <span className="animate-fade-in">
                      ${stats.totalRevenue.toLocaleString()}
                    </span>
                  )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card
          className="p-8 bg-gradient-card border-0 shadow-telegram hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:-translate-y-1"
          onClick={() => onNavigate("packages")}
        >
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-3xl group-hover:bg-blue-500/20 transition-all duration-300 group-hover:scale-110">
                <Package className="w-10 h-10 text-blue-500 transition-transform group-hover:scale-110" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-telegram rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-telegram transition-colors">
                Subscription Packages
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Manage VIP subscription plans, pricing, and features for your
                users with advanced analytics
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => onNavigate("support")}
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-2xl group-hover:bg-green-500/20 transition-colors">
              <HeadphonesIcon className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Customer Support</h3>
              <p className="text-muted-foreground">
                Handle user inquiries, manage tickets, and provide assistance
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => onNavigate("config")}
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-2xl group-hover:bg-blue-600/20 transition-colors">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Bot Configuration</h3>
              <p className="text-muted-foreground">
                Set up your bot token, webhooks, and essential settings
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => onNavigate("analytics")}
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl group-hover:bg-red-500/20 transition-colors">
              <BarChart3 className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Analytics & Reports
              </h3>
              <p className="text-muted-foreground">
                View detailed statistics, user engagement, and revenue reports
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => onNavigate("promos")}
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-2xl group-hover:bg-orange-500/20 transition-colors">
              <Gift className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Promo Codes</h3>
              <p className="text-muted-foreground">
                Create and manage discount codes and promotional campaigns
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-dc-brand/10 rounded-2xl group-hover:bg-dc-brand/20 transition-colors">
              <Bell className="w-8 h-8 text-dc-brand" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Notifications</h3>
              <p className="text-muted-foreground">
                Send announcements and updates to your subscribers
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-8 bg-gradient-to-br from-background to-muted border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => onNavigate("admin")}
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500/10 rounded-2xl group-hover:bg-teal-500/20 transition-colors">
              <Shield className="w-8 h-8 text-teal-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Admin Dashboard</h3>
              <p className="text-muted-foreground">
                Manage bot settings, content, and data tables
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open("/admin", "_blank")}
          >
            <FileText className="w-4 h-4" />
            View Admin Panel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onCheckStatus}
          >
            <Shield className="w-4 h-4" />
            Check Bot Status
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onRefreshStats}
          >
            <Activity className="w-4 h-4" />
            Refresh Stats
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            User Management
          </Button>
        </div>
      </Card>
    </div>
  );
}
