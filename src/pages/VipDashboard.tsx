import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import VipGate from "@/components/auth/VipGate";

const VipDashboardContent = () => (
  <div className="container mx-auto p-6">
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
  </div>
);

export default function VipDashboard() {
  return (
    <VipGate>
      <VipDashboardContent />
    </VipGate>
  );
}
