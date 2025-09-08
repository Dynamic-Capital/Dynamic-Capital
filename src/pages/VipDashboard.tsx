import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import VipGate from "@/components/auth/VipGate";
import { SubscriptionStatusCard } from "@/components/shared/SubscriptionStatusCard";
import VipQuickActions from "@/components/vip/VipQuickActions";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

const VipDashboardContent = () => {
  const { telegramUser } = useTelegramAuth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>VIP Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Exclusive insights and features for VIP members.
          </p>
        </CardContent>
      </Card>

      <SubscriptionStatusCard telegramUserId={telegramUser?.id?.toString()} />
      <VipQuickActions />
    </div>
  );
};

export default function VipDashboard() {
  return (
    <VipGate>
      <VipDashboardContent />
    </VipGate>
  );
}
