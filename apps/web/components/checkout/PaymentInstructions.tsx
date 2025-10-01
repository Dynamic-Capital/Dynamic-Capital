"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Building, Coins, FileText, Upload } from "lucide-react";
import type { BankAccount, CheckoutStep, PaymentMethod } from "./types";

interface PaymentInstructionsProps {
  paymentMethod: PaymentMethod;
  bankAccounts: BankAccount[];
  setCurrentStep: (step: CheckoutStep) => void;
}

export const PaymentInstructions: React.FC<PaymentInstructionsProps> = (
  { paymentMethod, bankAccounts, setCurrentStep },
) => (
  <div className="space-y-4">
    <Alert>
      <FileText className="h-4 w-4" />
      <AlertDescription>
        <strong>Step 1:</strong>{" "}
        Complete your payment using the details below, then upload your receipt.
      </AlertDescription>
    </Alert>

    {paymentMethod === "bank_transfer" && bankAccounts.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Bank Transfer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankAccounts.map((bank, idx) => (
            <div key={idx} className="p-4 border rounded-lg space-y-2">
              <div className="font-medium">{bank.bank_name}</div>
              <div className="text-sm space-y-1">
                <div>
                  <strong>Account Name:</strong> {bank.account_name}
                </div>
                <div>
                  <strong>Account Number:</strong> {bank.account_number}
                </div>
                <div>
                  <strong>Currency:</strong> {bank.currency}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )}

    {paymentMethod === "crypto" && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Cryptocurrency Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Send payment to the crypto address provided via Telegram. Upload
              your transaction receipt below.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )}

    <Button onClick={() => setCurrentStep("upload")} className="w-full">
      <Upload className="h-4 w-4 mr-2" />
      Upload Receipt
    </Button>
  </div>
);

export default PaymentInstructions;
