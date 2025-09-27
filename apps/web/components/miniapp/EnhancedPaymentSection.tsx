import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  FileImage,
  Loader2,
  Shield,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { TouchFeedback } from "@/components/ui/mobile-gestures";
import { ThreeDEmoticon } from "@/components/ui/three-d-emoticons";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/config/supabase";
import { supabase } from "@/integrations/supabase/client";

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  processing_time: string;
  available: boolean;
  recommended?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
}

interface PaymentInstructions {
  type: "bank_transfer" | "crypto";
  banks?: BankAccount[];
  address?: string;
  note?: string;
}

interface EnhancedPaymentSectionProps {
  selectedPlan?: Plan;
  onBack?: () => void;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    icon: Building2,
    description: "Secure bank-to-bank transfer",
    processing_time: "1-3 business days",
    available: true,
    recommended: true,
  },
  {
    id: "crypto",
    name: "Cryptocurrency",
    icon: Coins,
    description: "USDT (TRC20) payment",
    processing_time: "5-30 minutes",
    available: true,
  },
];

export function EnhancedPaymentSection(
  { selectedPlan, onBack }: EnhancedPaymentSectionProps,
) {
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<
    PaymentInstructions | null
  >(null);
  const [paymentId, setPaymentId] = useState<string>("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setPaymentInstructions(null);
    setPaymentId("");
  };

  const initiatePayment = async () => {
    if (!selectedPlan || !selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, status } = await callEdgeFunction("CHECKOUT_INIT", {
        method: "POST",
        body: {
          plan_id: selectedPlan.id,
          method: selectedMethod,
          currency: selectedPlan.currency,
          amount: selectedPlan.price,
        },
      });

      if (status !== 200 || !(data as any)?.ok) {
        throw new Error((data as any)?.error || "Payment initiation failed");
      }

      setPaymentInstructions((data as any).instructions);
      setPaymentId((data as any).payment_id);

      toast.success("Payment instructions generated successfully!");
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to initiate payment",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!paymentId) {
      toast.error("Please initiate payment first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to Supabase storage
      const fileName = `receipts/${paymentId}_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .upload(fileName, file);

      if (error) throw error;

      // Update payment record with receipt
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          payment_provider_id: fileName,
          status: "pending_review",
        })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success("Receipt uploaded successfully! Payment is under review.");
      setReceipt(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (!selectedPlan) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center gap-2 justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
            No Plan Selected
          </CardTitle>
          <CardDescription>
            Please select a subscription plan to continue with payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onBack} variant="outline" className="w-full">
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Payment for {selectedPlan.name}
          </CardTitle>
          <CardDescription>
            Complete your payment to activate your subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{selectedPlan.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedPlan.is_lifetime
                  ? "Lifetime Access"
                  : `${selectedPlan.duration_months} months`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {selectedPlan.price} {selectedPlan.currency}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {!paymentInstructions && (
        <Card>
          <CardHeader>
            <CardTitle>Select Payment Method</CardTitle>
            <CardDescription>
              Choose your preferred payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {paymentMethods.map((method) => (
                <motion.div
                  key={method.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <TouchFeedback>
                    <Card
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        selectedMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                        !method.available && "opacity-50 cursor-not-allowed",
                      )}
                      onClick={() =>
                        method.available && handleMethodSelect(method.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {React.createElement(
                              method.icon as React.ComponentType<
                                { className?: string }
                              >,
                              { className: "h-6 w-6 text-primary" },
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{method.name}</h3>
                              {method.recommended && (
                                <Badge variant="secondary" className="text-xs">
                                  Recommended
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {method.processing_time}
                              </span>
                            </div>
                          </div>
                          {selectedMethod === method.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TouchFeedback>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Instructions */}
      {paymentInstructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to complete your payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bank Transfer Instructions */}
            {paymentInstructions.type === "bank_transfer" &&
              paymentInstructions.banks && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Bank Details</h4>
                  {paymentInstructions.banks.map((bank, index) => (
                    <div key={index} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-medium">{bank.bank_name}</span>

                        <span className="text-muted-foreground">
                          Account Name:
                        </span>
                        <span className="font-medium">{bank.account_name}</span>

                        <span className="text-muted-foreground">
                          Account Number:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {bank.account_number}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(bank.account_number)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-bold text-primary">
                          {selectedPlan.price} {bank.currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Crypto Instructions */}
            {paymentInstructions.type === "crypto" &&
              paymentInstructions.address && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Crypto Details</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Network:</span>
                      <span className="font-medium">TRON (TRC20)</span>

                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium">USDT</span>

                      <span className="text-muted-foreground">Address:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs break-all">
                          {paymentInstructions.address}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(paymentInstructions.address!)}
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-primary">
                        {selectedPlan.price} USDT
                      </span>
                    </div>
                  </div>
                  {paymentInstructions.note && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Important:</strong> {paymentInstructions.note}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Receipt Upload */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="receipt" className="text-base font-medium">
                  Upload Payment Receipt
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a screenshot or photo of your payment confirmation
                </p>

                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {receipt
                    ? (
                      <div className="space-y-2">
                        <FileImage className="h-8 w-8 mx-auto text-primary" />
                        <p className="text-sm font-medium">{receipt.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(receipt.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReceipt(null)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    )
                    : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <div>
                          <Button
                            variant="outline"
                            onClick={() =>
                              document.getElementById("receipt-input")?.click()}
                            disabled={isUploading}
                          >
                            {isUploading
                              ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              )
                              : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Choose File
                                </>
                              )}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            PNG, JPG, PDF up to 10MB
                          </p>
                        </div>
                      </div>
                    )}

                  <input
                    id="receipt-input"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error("File size must be less than 10MB");
                          return;
                        }
                        handleFileUpload(file);
                      }
                    }}
                  />
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          Back
        </Button>

        {!paymentInstructions
          ? (
            <Button
              onClick={initiatePayment}
              disabled={!selectedMethod || isProcessing}
              className="flex-1"
            >
              {isProcessing
                ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                )
                : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
            </Button>
          )
          : (
            <Button
              onClick={() => toast.success("Payment submitted for review!")}
              disabled={!receipt}
              className="flex-1"
            >
              Submit Payment
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          )}
      </div>

      {/* Security Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Secure Payment</p>
              <p className="text-xs text-muted-foreground">
                Your payment information is protected. We never store sensitive
                financial data. All transactions are verified manually for
                security.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
