import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, Star } from "lucide-react";
import { MotionCard } from "@/components/ui/motion-card";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { cardVariants } from "@/lib/motion-variants";

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
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  useEffect(() => {
    if (isInTelegram && telegramData?.user?.id) {
      // Fetch subscription status from Telegram mini app
      fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/subscription-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramData.user.id
        })
      })
      .then(res => res.json())
      .then(data => {
        setSubscription(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isInTelegram, telegramData?.user?.id]);

  const getStatusBadge = () => {
    if (!subscription) return <Badge variant="outline">Not Connected</Badge>;
    
    if (subscription.is_expired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (subscription.is_vip) {
      return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">VIP Active</Badge>;
    }
    
    if (subscription.payment_status === 'pending') {
      return <Badge variant="secondary">Payment Pending</Badge>;
    }
    
    return <Badge variant="outline">Free</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <FadeInOnView>
      <MotionCard variant="glass" className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Status
          </CardTitle>
          <CardDescription>Your current status and subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Connection:</span>
              {isInTelegram ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                  Web Browser
                </Badge>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Subscription:</span>
              {getStatusBadge()}
            </div>

            {loading && (
              <div className="text-center text-muted-foreground py-2">
                Loading subscription details...
              </div>
            )}

            {!loading && subscription && subscription.is_vip && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">{subscription.plan_name || 'VIP'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires:</span>
                  <span>{formatDate(subscription.subscription_end_date)}</span>
                </div>
                
                {subscription.days_remaining !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Remaining:</span>
                    <span className={`font-medium ${
                      subscription.days_remaining < 7 ? 'text-orange-500' : 'text-green-600'
                    }`}>
                      {subscription.days_remaining}
                    </span>
                  </div>
                )}

                {subscription.payment_status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment:</span>
                    <span className="capitalize">
                      {subscription.payment_status === 'completed' ? '✅ Verified' : 
                       subscription.payment_status === 'pending' ? '⏳ Pending' : '❌ ' + subscription.payment_status}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span>{telegramData?.platform || 'Web'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Theme:</span>
                <span className="capitalize">{telegramData?.colorScheme || 'System'}</span>
              </div>
              {telegramData?.user && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-xs">{telegramData.user.id}</span>
                </div>
              )}
            </div>
          </div>

            {!loading && (!subscription || !subscription.is_vip) && (
              <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg">
                <div className="text-center space-y-2">
                  <Star className="h-6 w-6 text-primary mx-auto" />
                  <div className="text-sm font-medium">
                    {isInTelegram ? 'Upgrade to VIP' : 'VIP Access Available'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isInTelegram 
                      ? 'Get access to premium trading signals and exclusive features'
                      : 'Open in Telegram to access VIP features and complete subscription'
                    }
                  </div>
                  <Button size="sm" className="mt-2" onClick={() => {
                    if (isInTelegram) {
                      const url = new URL(window.location.href);
                      url.searchParams.set('tab', 'plan');
                      window.history.pushState({}, '', url.toString());
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    } else {
                      const botUsername = "Dynamic_VIP_BOT";
                      const telegramUrl = `https://t.me/${botUsername}`;
                      window.open(telegramUrl, '_blank');
                    }
                  }}>
                    {isInTelegram ? 'View Plans' : 'Open in Telegram'}
                  </Button>
                </div>
              </div>
            )}

            {!isInTelegram && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-sm text-blue-600 text-center">
                  💡 For real-time subscription status and payments, open in Telegram
                </div>
              </div>
            )}
        </CardContent>
      </MotionCard>
    </FadeInOnView>
  );
}