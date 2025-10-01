"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Crown, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export const VipQuickActions = () => {
  const router = useRouter();

  const actions = [
    { icon: CreditCard, label: "Checkout", path: "/#checkout" },
    { icon: Upload, label: "Upload Receipt", path: "/payment-status" },
    { icon: Crown, label: "View Plans", path: "/plans" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            onClick={() => router.push(action.path)}
            className="flex items-center gap-2"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default VipQuickActions;
