import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Calendar, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  onUpgrade 
}: SubscriptionStatusCardProps) => {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Extract telegram user ID from multiple sources
  const getUserId = () => {
    if (telegramUserId) return telegramUserId;
    if (telegramData?.user?.id) return telegramData.user.id.toString();
    return null;
  };

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      fetchSubscriptionStatus(userId);
    } else {
      setLoading(false);
    }
  }, [telegramUserId, telegramData]);

  const fetchSubscriptionStatus = async (userId: string) => {
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/subscription-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_user_id: userId
        })
      });

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (!status.is_vip) {
      return <Badge variant="outline">Free</Badge>;
    }

    if (status.is_expired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    if (status.payment_status === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }

    return <Badge className="bg-primary text-primary-foreground">VIP Active</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading subscription status...</span>
        </CardContent>
      </Card>
    );
  }

  const currentUserId = getUserId();
  
  if (!currentUserId) {
    return (
      <Card>
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
      </Card>
    );
  }

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Subscription Status
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status?.is_vip ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan:</span>
              <span className="text-sm">{status.plan_name || 'VIP'}</span>
            </div>

            {status.subscription_end_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Expires:</span>
                <span className="text-sm">{formatDate(status.subscription_end_date)}</span>
              </div>
            )}

            {status.days_remaining !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Days remaining:</span>
                <span className={`text-sm font-medium ${
                  status.days_remaining <= 7 ? 'text-destructive' : 'text-primary'
                }`}>
                  {status.days_remaining}
                </span>
              </div>
            )}

            {status.payment_status && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment:</span>
                <div className="flex items-center gap-1">
                  {status.payment_status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm capitalize">{status.payment_status}</span>
                </div>
              </div>
            )}

            {status.is_expired && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">
                  Your subscription has expired. Renew now to continue enjoying VIP benefits.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">No Active Subscription</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to VIP to access premium trading signals and exclusive content.
            </p>
            <Button onClick={onUpgrade} className="w-full">
              Choose VIP Plan
            </Button>
          </div>
        )}

        {status?.is_vip && (status.days_remaining === null || status.days_remaining > 0) && !status.is_expired && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>VIP benefits active</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};