import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  UserCheck, 
  MessageSquare,
  Database,
  Activity,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useSupabase } from "@/context/SupabaseProvider";
import { AdminGate } from "./AdminGate";
import { AdminLogs } from "./AdminLogs";
import { AdminBans } from "./AdminBans";
import { BroadcastManager } from "./BroadcastManager";
import { BotDiagnostics } from "./BotDiagnostics";
import { callEdgeFunction } from "@/config/supabase";

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
    return telegramUser?.id?.toString() || telegramData?.user?.id?.toString() || null;
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        return profile?.role === 'admin';
      }
      
      return false;
    } catch (error) {
      console.error('Admin access check error:', error);
      return false;
    }
  }, [telegramData, supabase]);

  const loadAdminData = useCallback(async () => {
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
      const { data: statsData, error: statsError } = await callEdgeFunction<AdminStats>('ANALYTICS_DATA', {
        method: 'POST',
        headers: {
          ...(auth.token ? { 'Authorization': `Bearer ${auth.token}` } : {})
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
          timeframe: "today"
        }
      });

      if (statsError) {
        throw new Error(statsError.message);
      }

      if (statsData) {
        setStats(statsData as AdminStats);
      }

      // Load pending payments
      const { data: paymentsData, error: paymentsError } = await callEdgeFunction('ADMIN_LIST_PENDING', {
        method: 'POST',
        headers: {
          ...(auth.token ? { 'Authorization': `Bearer ${auth.token}` } : {})
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
          limit: 20,
          offset: 0
        }
      });

      if (paymentsError) {
      throw new Error(paymentsError.message);
      }

      if (paymentsData) {
        setPendingPayments((paymentsData as any).items || []);
      }

    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin dashboard data",
        variant: "destructive",
      });
    }
  }, [checkAdminAccess, getAdminAuth, toast]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData, telegramData, supabase]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && !telegramData) {
        loadAdminData();
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadAdminData, telegramData, supabase]);

  const handlePaymentAction = async (paymentId: string, decision: 'approve' | 'reject') => {
    try {
      const auth = getAdminAuth();
      if (!auth) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callEdgeFunction('ADMIN_ACT_ON_PAYMENT', {
        method: 'POST',
        headers: {
          ...(auth.token ? { 'Authorization': `Bearer ${auth.token}` } : {})
        },
        body: {
          ...(auth.initData ? { initData: auth.initData } : {}),
          payment_id: paymentId,
          decision: decision,
          message: `Payment ${decision}d by admin`
        }
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
        throw new Error((data as any)?.error || `Failed to ${decision} payment`);
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
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading admin dashboard...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            You don't have admin privileges to access this dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AdminGate>
      <div className="space-y-6 animate-in">
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading animate-glow">
            <Shield className="icon-base text-primary animate-float" />
            Admin Dashboard
          </CardTitle>
          <p className="text-body-sm text-muted-foreground">
            Welcome back, {telegramUser?.first_name || 'Admin'}
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 glass-card">
          <TabsTrigger value="overview" className="glass-tab">Overview</TabsTrigger>
          <TabsTrigger value="payments" className="glass-tab">Payments</TabsTrigger>
          <TabsTrigger value="logs" className="glass-tab">Logs</TabsTrigger>
          <TabsTrigger value="bans" className="glass-tab">Bans</TabsTrigger>
          <TabsTrigger value="broadcast" className="glass-tab">Broadcast</TabsTrigger>
          <TabsTrigger value="bot" className="glass-tab">Bot</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 animate-slide-up">
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass-card ui-card-interactive animate-bounce-in">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="icon-sm text-primary animate-pulse-glow" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.total_users}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.vip_users} VIP users
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card ui-card-interactive animate-bounce-in" style={{animationDelay: '0.1s'}}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="icon-sm text-green-500 animate-pulse-glow" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">${stats.total_revenue}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.completed_payments} payments
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card ui-card-interactive animate-bounce-in" style={{animationDelay: '0.2s'}}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="icon-sm text-yellow-500 animate-pulse-glow" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{stats.pending_payments}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card ui-card-interactive animate-bounce-in" style={{animationDelay: '0.3s'}}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="icon-sm text-blue-500 animate-pulse-glow" />
                    Daily Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">{stats.daily_interactions}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.daily_sessions} sessions
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pending Payments ({pendingPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No pending payments
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          ${payment.amount} {payment.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          User: {payment.telegram_user_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handlePaymentAction(payment.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handlePaymentAction(payment.id, 'reject')}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <AdminLogs />
        </TabsContent>

        <TabsContent value="bans" className="space-y-4">
          <AdminBans />
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-4">
          <BroadcastManager />
        </TabsContent>

        <TabsContent value="bot" className="space-y-4">
          <BotDiagnostics />
        </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  );
};