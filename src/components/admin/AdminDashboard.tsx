import { useState, useEffect } from "react";
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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const { toast } = useToast();
  const { telegramUser, isAdmin, loading, checkAdminStatus } = useTelegramAuth();

  const getUserId = () => {
    return telegramUser?.id?.toString() || telegramData?.user?.id?.toString() || null;
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);


  const loadAdminData = async () => {
    try {
      // Load admin stats
      const statsResponse = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/analytics-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load pending payments
      const paymentsResponse = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/admin-list-pending', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPendingPayments(paymentsData.payments || []);
      }

    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin dashboard data",
        variant: "destructive",
      });
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/admin-act-on-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: paymentId,
          action: action,
          admin_telegram_id: getUserId()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Payment ${action}d successfully`,
        });
        
        // Refresh pending payments
        await loadAdminData();
      } else {
        throw new Error(data.error || `Failed to ${action} payment`);
      }
    } catch (error) {
      console.error(`Failed to ${action} payment:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} payment`,
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
        <TabsList className="grid w-full grid-cols-4 glass-card">
          <TabsTrigger value="overview" className="glass-tab">Overview</TabsTrigger>
          <TabsTrigger value="payments" className="glass-tab">Payments</TabsTrigger>
          <TabsTrigger value="users" className="glass-tab">Users</TabsTrigger>
          <TabsTrigger value="settings" className="glass-tab">Settings</TabsTrigger>
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

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-4">
                User management features coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Bot Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-4">
                Settings management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};