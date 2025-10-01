"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CreditCard, Shield, Zap } from "lucide-react";

interface CheckoutButtonProps {
  plan: string;
}

export const CheckoutButton = ({ plan }: CheckoutButtonProps) => {
  const router = useRouter();

  const handleCheckout = () => {
    router.push(
      `/payment-status?status=success&plan=${encodeURIComponent(plan)}`,
    );
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleCheckout}
        className="w-full flex items-center justify-center gap-2"
      >
        <CreditCard className="h-4 w-4" />
        Proceed to Checkout
      </Button>
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Secure payment powered by Dynamic Capital</span>
      </div>
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Zap className="h-4 w-4" />
        <span>Instant access after confirmation</span>
      </div>
    </div>
  );
};

export default CheckoutButton;
