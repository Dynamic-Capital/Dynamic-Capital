import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViewHeader } from "./ViewHeader";

interface PackagesViewProps {
  onBack: () => void;
}

const PLANS = [
  { name: "1 Month VIP", price: "$9.99", duration: "1 month", popular: false },
  { name: "3 Month VIP", price: "$24.99", duration: "3 months", popular: true },
  { name: "6 Month VIP", price: "$44.99", duration: "6 months", popular: false },
  { name: "Lifetime VIP", price: "$99.99", duration: "Lifetime", popular: false },
];

export function PackagesView({ onBack }: PackagesViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeader
        title="Subscription Packages"
        description="Manage your VIP subscription plans"
        onBack={onBack}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <Card key={plan.name} className="p-6 bg-gradient-to-br from-background to-muted border-0 shadow-lg relative">
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Most Popular</Badge>
              </div>
            )}
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-3xl font-bold text-blue-600">{plan.price}</p>
                <p className="text-muted-foreground">{plan.duration}</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✓ Premium signals</p>
                <p>✓ VIP chat access</p>
                <p>✓ Priority support</p>
                <p>✓ Market analysis</p>
              </div>
              <Button variant="default" className="w-full">
                Edit Plan
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
