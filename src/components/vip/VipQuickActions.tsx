"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Upload, Crown } from "lucide-react";
import { useRouter } from "next/navigation";

export const VipQuickActions = () => {
  const router = useRouter();

  const actions = [
    { icon: CreditCard, label: "Checkout", path: "/checkout" },
    { icon: Upload, label: "Upload Receipt", path: "/payment-status" },
    { icon: Crown, label: "View Plans", path: "/plans" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map(({ icon: Icon, label, path }) => (
          <Button
            key={label}
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.push(path)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default VipQuickActions;
