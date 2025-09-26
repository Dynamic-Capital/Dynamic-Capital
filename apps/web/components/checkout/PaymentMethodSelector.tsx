"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Building,
  Coins,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { PaymentMethod } from "./types";

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  handleCheckout: () => void;
  processingCheckout: boolean;
  finalPrice: number;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  setPaymentMethod,
  handleCheckout,
  processingCheckout,
  finalPrice,
}) => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Choose Payment Method</CardTitle>
        <CardDescription>
          Select how you'd like to complete your payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={paymentMethod}
          onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="telegram">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Continue in Telegram (Recommended)
              </div>
            </SelectItem>
            <SelectItem value="bank_transfer">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Bank Transfer
              </div>
            </SelectItem>
            <SelectItem value="crypto">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Cryptocurrency
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>

    <Button
      onClick={handleCheckout}
      disabled={processingCheckout}
      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {processingCheckout
        ? <Loader2 className="h-5 w-5 animate-spin mr-2" />
        : paymentMethod === "telegram"
        ? <ExternalLink className="h-5 w-5 mr-2" />
        : <CreditCard className="h-5 w-5 mr-2" />}
      {paymentMethod === "telegram"
        ? "Continue in Telegram"
        : `Pay with ${
          paymentMethod === "bank_transfer" ? "Bank Transfer" : "Crypto"
        }`} - ${finalPrice.toFixed(2)}
    </Button>
  </div>
);

export default PaymentMethodSelector;
