"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimatePresence } from "framer-motion";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/config/supabase";
import logger from "@/utils/logger";
import type { Plan } from "@/types/plan";
import type { TelegramWindow } from "@/types/telegram-webapp";
import type { ReceiptUploadBody, ReceiptSubmitBody, ApiError } from "@/types/receipts";
import { PaymentMethod, CheckoutStep, BankAccount } from "./types";
import PlanSummary from "./PlanSummary";
import PromoCodeForm from "./PromoCodeForm";
import PaymentMethodSelector from "./PaymentMethodSelector";
import PaymentInstructions from "./PaymentInstructions";
import ReceiptUpload from "./ReceiptUpload";
import PendingReview from "./PendingReview";
import DigitalReceipt from "./DigitalReceipt";

interface WebCheckoutProps {
  selectedPlanId?: string;
  promoCode?: string;
}

export const WebCheckout: React.FC<WebCheckoutProps> = ({
  selectedPlanId,
  promoCode: initialPromoCode
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [promoCode, setPromoCode] = useState(initialPromoCode || "");
  const [promoValidation, setPromoValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("telegram");
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("method");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [retrying, setRetrying] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (currentStep === "pending") {
      setShowReceipt(true);
    }
  }, [currentStep]);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await callEdgeFunction('PLANS');
      if (error) {
        throw new Error(error.message);
      }
      setPlans((data as any)?.plans || []);
      if ((data as any)?.plans?.length > 0 && !selectedPlan) {
        setSelectedPlan((data as any).plans[0]);
      }
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  useEffect(() => {
    const tg = typeof window !== "undefined" ? (window as TelegramWindow).Telegram?.WebApp : undefined;
    const initData = tg?.initData;
    setIsTelegram(!!initData);
    if (initData) {
      setTelegramInitData(initData);
      logger.log("Running inside Telegram WebApp");
    }
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (selectedPlanId && plans.length > 0) {
      const plan = plans.find(p => p.id === selectedPlanId);
      setSelectedPlan(plan || plans[0]);
    }
  }, [selectedPlanId, plans]);

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !selectedPlan) return;
    setValidatingPromo(true);
    try {
      const { data, error } = await callEdgeFunction('PROMO_VALIDATE', {
        method: 'POST',
        body: {
          code: promoCode,
          plan_id: selectedPlan.id,
        },
      });
      if (error) {
        throw new Error(error.message);
      }
      setPromoValidation(data);
      if ((data as any)?.valid) {
        toast.success(`Promo code applied! ${(data as any).discount_type === 'percentage' ? (data as any).discount_value + '%' : '$' + (data as any).discount_value} discount`);
      } else {
        toast.error((data as any)?.reason || 'Invalid promo code');
      }
    } catch (error) {
      toast.error('Failed to validate promo code');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    if (paymentMethod === "telegram") {
      setProcessingCheckout(true);
      try {
        const botUsername = "Dynamic_VIP_BOT";
        const telegramUrl = `https://t.me/${botUsername}?start=plan_${selectedPlan.id}${promoValidation?.valid ? `_promo_${promoCode}` : ''}`;
        window.open(telegramUrl, '_blank');
        toast.success('Redirecting to Telegram to complete purchase');
      } catch (error) {
        toast.error('Failed to initiate checkout');
      } finally {
        setProcessingCheckout(false);
      }
      return;
    }

    setProcessingCheckout(true);
    try {
      let telegramId: string | null = null;
      if (isTelegram && telegramInitData) {
        logger.log("Using Telegram initData for checkout");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          telegramId = user.user_metadata?.telegram_id || user.id;
        } else {
          telegramId = crypto.randomUUID();
        }
      }
      const requestBody: Record<string, unknown> = {
        plan_id: selectedPlan.id,
        method: paymentMethod
      };
      if (isTelegram && telegramInitData) {
        requestBody.initData = telegramInitData;
      } else if (telegramId) {
        requestBody.telegram_id = telegramId;
      }
      const { data, error } = await supabase.functions.invoke('checkout-init', {
        body: requestBody
      });
      if (error) {
        throw new Error(error.message || 'Failed to initialize payment');
      }
      setPaymentId(data.payment_id);
      if (data.instructions?.type === "bank_transfer") {
        setBankAccounts(data.instructions.banks || []);
      }
      setCurrentStep("instructions");
      toast.success('Payment initiated successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to initiate checkout';
      toast.error(message);
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile || !paymentId) return;
    setUploading(true);
    setUploadStatus('idle');
    try {
      const uploadRequestBody: ReceiptUploadBody = {
        payment_id: paymentId,
        filename: uploadedFile.name,
        content_type: uploadedFile.type
      };
      if (isTelegram && telegramInitData) {
        uploadRequestBody.initData = telegramInitData;
      }
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('receipt-upload-url', {
        body: uploadRequestBody
      });
      if (uploadError) {
        const { message } = uploadError as ApiError;
        throw new Error(message);
      }
      if (!uploadData?.upload_url) {
        throw new Error('No upload URL received');
      }
      const uploadResponse = await fetch(uploadData.upload_url, {
        method: 'PUT',
        body: uploadedFile,
        headers: {
          'Content-Type': uploadedFile.type,
          'x-amz-acl': 'private'
        }
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }
      const submitRequestBody: ReceiptSubmitBody = {
        payment_id: paymentId,
        file_path: uploadData.file_path,
        bucket: uploadData.bucket
      };
      if (isTelegram && telegramInitData) {
        submitRequestBody.initData = telegramInitData;
      }
      const { error: submitError } = await supabase.functions.invoke('receipt-submit', {
        body: submitRequestBody
      });
      if (submitError) {
        const { message } = submitError as ApiError;
        throw new Error(message);
      }
      setCurrentStep("pending");
      setUploadStatus('success');
      toast.success('Receipt uploaded successfully! Your payment is being reviewed.');
    } catch (error: unknown) {
      setUploadStatus('error');
      const message = error instanceof Error ? error.message : 'Failed to upload receipt';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRetryUpload = async () => {
    if (!uploadedFile) return;
    setRetrying(true);
    await handleFileUpload();
    setRetrying(false);
  };

  const calculateFinalPrice = () => {
    if (!selectedPlan) return 0;
    if (!promoValidation?.valid) return selectedPlan.price;
    if (promoValidation.discount_type === 'percentage') {
      return selectedPlan.price * (1 - promoValidation.discount_value / 100);
    } else {
      return Math.max(0, selectedPlan.price - promoValidation.discount_value);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading checkout...
        </div>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No plan selected. Please select a plan to continue.
        </AlertDescription>
      </Alert>
    );
  }

  const finalPrice = calculateFinalPrice();

  return (
    <>
      <div className="container mx-auto px-4 max-w-4xl space-y-6 sm:space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="mb-2">
            <Shield className="h-3 w-3 mr-1" />
            Secure Checkout
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Complete Your Purchase
          </h1>
          <p className="text-muted-foreground">
            Join thousands of traders using our premium tools
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
          <PlanSummary plan={selectedPlan} finalPrice={finalPrice} promoValidation={promoValidation} />

          <div className="space-y-4">
            {plans.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Choose Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plans.map((plan) => (
                    <Button
                      key={plan.id}
                      variant={selectedPlan.id === plan.id ? "default" : "outline"}
                      className="w-full justify-between h-auto p-4"
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-xs opacity-75">
                          {plan.is_lifetime ? 'Lifetime' : `${plan.duration_months} months`}
                        </div>
                      </div>
                      <div className="font-bold">${plan.price}</div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            <PromoCodeForm
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              validatePromoCode={validatePromoCode}
              validatingPromo={validatingPromo}
              promoValidation={promoValidation}
            />

            <Separator />

            {currentStep === "method" && (
              <PaymentMethodSelector
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                handleCheckout={handleCheckout}
                processingCheckout={processingCheckout}
                finalPrice={finalPrice}
              />
            )}

            {currentStep === "instructions" && (
              <PaymentInstructions
                paymentMethod={paymentMethod}
                bankAccounts={bankAccounts}
                setCurrentStep={setCurrentStep}
              />
            )}

            {currentStep === "upload" && (
              <ReceiptUpload
                uploadedFile={uploadedFile}
                setUploadedFile={setUploadedFile}
                handleFileUpload={handleFileUpload}
                uploading={uploading}
                uploadStatus={uploadStatus}
                handleRetry={handleRetryUpload}
                retrying={retrying}
              />
            )}

            {currentStep === "pending" && <PendingReview paymentId={paymentId} />}

            {currentStep === "method" && (
              <p className="text-xs text-center text-muted-foreground">
                By proceeding, you agree to our Terms of Service and Privacy Policy.
              </p>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showReceipt && (
          <DigitalReceipt
            plan={selectedPlan}
            finalPrice={finalPrice}
            promoCode={promoCode}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default WebCheckout;
