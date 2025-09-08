import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardData {
  user: {
    is_vip: boolean;
    subscription_expires_at: string | null;
  };
}

export default function VipDashboard() {
  const { telegramUser, isVip, loading } = useTelegramAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (telegramUser) {
      fetch(`https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/api/vip-dashboard?telegram_user_id=${telegramUser.id}`)
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Failed to load VIP dashboard");
          }
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message));
    }
  }, [telegramUser]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!telegramUser) {
    return <div className="p-4 text-center">Sign in via Telegram to view your VIP dashboard.</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-destructive">{error}</div>;
  }

  if (!isVip || !data?.user.is_vip) {
    return (
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>VIP Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Upgrade to a VIP plan to unlock exclusive features.</p>
            <Button asChild>
              <Link to="/plans">View Plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>VIP Member</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2">Welcome back, {telegramUser.first_name}.</p>
          {data?.user.subscription_expires_at && (
            <p>
              Subscription expires on {new Date(data.user.subscription_expires_at).toLocaleDateString()}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

