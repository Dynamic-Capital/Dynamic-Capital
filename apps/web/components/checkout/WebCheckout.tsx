"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/config/supabase";
import logger from "@/utils/logger";
import type { Plan } from "@/types/plan";
import {
  BankAccount,
  CheckoutStep,
  PaymentMethod,
  PromoValidationResult,
} from "./types";
import PlanSummary from "./PlanSummary";
import PromoCodeForm from "./PromoCodeForm";
import PaymentMethodSelector from "./PaymentMethodSelector";
import PaymentInstructions from "./PaymentInstructions";
import ReceiptUpload from "./ReceiptUpload";
import PendingReview from "./PendingReview";
import DigitalReceipt from "./DigitalReceipt";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatPrice } from "@/utils";

interface WebCheckoutProps {
  selectedPlanId?: string;
  promoCode?: string;
}

type RawPromoValidationResponse = {
  valid?: boolean;
  ok?: boolean;
  discount_type?: string | null;
  type?: string | null;
  discount_value?: number | string | null;
  value?: number | string | null;
  final_amount?: number | string | null;
  reason?: string | null;
};

const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveDiscountTypeFromString = (
  value?: string | null,
): "percentage" | "fixed" | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "percentage" || normalized === "percent") {
    return "percentage";
  }
  return "fixed";
};

const normalizePromoValidation = (
  raw: RawPromoValidationResponse | null,
): PromoValidationResult | null => {
  if (!raw) return null;

  const isValid = Boolean(raw.valid ?? raw.ok);
  if (!isValid) {
    return {
      valid: false,
      reason: typeof raw.reason === "string" ? raw.reason : undefined,
    };
  }

  const discountType = resolveDiscountTypeFromString(
    raw.discount_type ?? raw.type,
  );
  const discountValue = parseNumericValue(raw.discount_value ?? raw.value) ??
    undefined;
  const finalAmount = parseNumericValue(raw.final_amount) ?? undefined;

  return {
    valid: true,
    discountType,
    discountValue,
    finalAmount,
  };
};

const computeDiscountAmount = (
  basePrice: number,
  validation: PromoValidationResult,
): number => {
  if (!validation.valid) {
    return 0;
  }

  if (typeof validation.finalAmount === "number") {
    return Math.max(0, basePrice - validation.finalAmount);
  }

  if (
    validation.discountType === "percentage" &&
    typeof validation.discountValue === "number"
  ) {
    return Math.max(0, basePrice * (validation.discountValue / 100));
  }

  if (typeof validation.discountValue === "number") {
    return Math.max(0, validation.discountValue);
  }

  return 0;
};

export const WebCheckout: React.FC<WebCheckoutProps> = ({
  selectedPlanId,
  promoCode: initialPromoCode,
}) => {
  const {
    plans,
    loading: plansLoading,
    error: plansError,
    hasData: plansLoaded,
    refresh,
  } = useSubscriptionPlans();
  const { trackPlanView, trackCheckoutStart, trackPromoApplied } =
    useAnalytics();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [promoCode, setPromoCode] = useState(initialPromoCode ?? "");
  const [promoValidation, setPromoValidation] = useState<
    PromoValidationResult | null
  >(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("telegram");
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("method");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [retrying, setRetrying] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const previousPlanId = useRef<string | null>(null);

  const planCurrency = selectedPlan?.currency ?? "USD";
  const basePlanPrice = selectedPlan
    ? selectedPlan.pricing?.displayPrice ?? selectedPlan.price
    : 0;

  useEffect(() => {
    if (currentStep === "pending") {
      setShowReceipt(true);
    }
  }, [currentStep]);

  useEffect(() => {
    const telegramData = window.Telegram?.WebApp?.initData;
    const isInTelegram = Boolean(telegramData);
    setIsTelegram(isInTelegram);

    if (isInTelegram && telegramData) {
      setTelegramInitData(telegramData);
      logger.log("Running inside Telegram WebApp");
    }
  }, []);

  useEffect(() => {
    if (plans.length === 0) {
      setSelectedPlan(null);
      return;
    }

    setSelectedPlan((current) => {
      if (selectedPlanId) {
        const fromQuery = plans.find((plan) => plan.id === selectedPlanId);
        if (fromQuery) {
          return fromQuery;
        }
      }

      if (current) {
        const stillExists = plans.find((plan) => plan.id === current.id);
        if (stillExists) {
          return stillExists;
        }
      }

      return plans[0];
    });
  }, [plans, selectedPlanId]);

  useEffect(() => {
    setPromoCode(initialPromoCode ?? "");
    setPromoValidation(null);
  }, [initialPromoCode]);

  useEffect(() => {
    if (!selectedPlan) {
      return;
    }

    if (previousPlanId.current === selectedPlan.id) {
      return;
    }

    previousPlanId.current = selectedPlan.id;
    trackPlanView(selectedPlan.id, selectedPlan.name);
    setPromoValidation(null);
  }, [selectedPlan, trackPlanView]);

  useEffect(() => {
    if (!promoCode) {
      setPromoValidation(null);
    }
  }, [promoCode]);

  const finalPrice = useMemo(() => {
    if (!selectedPlan) {
      return 0;
    }

    if (!promoValidation?.valid) {
      return basePlanPrice;
    }

    if (typeof promoValidation.finalAmount === "number") {
      return Math.max(0, promoValidation.finalAmount);
    }

    if (
      promoValidation.discountType === "percentage" &&
      typeof promoValidation.discountValue === "number"
    ) {
      return Math.max(
        0,
        basePlanPrice * (1 - promoValidation.discountValue / 100),
      );
    }

    if (typeof promoValidation.discountValue === "number") {
      return Math.max(0, basePlanPrice - promoValidation.discountValue);
    }

    return basePlanPrice;
  }, [basePlanPrice, promoValidation, selectedPlan]);

  const validatePromoCode = async () => {
    if (!selectedPlan) return;
    const normalizedCode = promoCode.trim().toUpperCase();
    if (!normalizedCode) return;

    setValidatingPromo(true);
    try {
      const { data, error } = await callEdgeFunction<
        RawPromoValidationResponse
      >(
        "PROMO_VALIDATE",
        {
          method: "POST",
          body: {
            code: normalizedCode,
            plan_id: selectedPlan.id,
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      const normalized = normalizePromoValidation(data ?? null);
      setPromoValidation(normalized);
      setPromoCode(normalizedCode);

      if (normalized?.valid) {
        const discountAmount = computeDiscountAmount(basePlanPrice, normalized);
        if (discountAmount > 0) {
          trackPromoApplied(normalizedCode, selectedPlan.id, discountAmount);
        } else {
          trackPromoApplied(normalizedCode, selectedPlan.id);
        }

        let discountLabel: string | null = null;
        if (normalized.discountType === "percentage") {
          const percentage = normalized.discountValue ?? 0;
          discountLabel = `${percentage}%`;
        } else if (discountAmount > 0) {
          discountLabel = formatPrice(discountAmount, planCurrency, "en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          });
        } else if (typeof normalized.discountValue === "number") {
          discountLabel = formatPrice(
            normalized.discountValue,
            planCurrency,
            "en-US",
            {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            },
          );
        }

        if (discountLabel) {
          toast.success(`Promo code applied! ${discountLabel} discount`);
        } else {
          toast.success("Promo code applied!");
        }
      } else {
        toast.error(normalized?.reason || "Invalid promo code");
      }
    } catch (error) {
      logger.error("Promo validation failed", error);
      toast.error("Failed to validate promo code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    trackCheckoutStart(selectedPlan.id, finalPrice);

    if (paymentMethod === "telegram") {
      setProcessingCheckout(true);
      try {
        const botUsername = "DynamicCapital_Support";
        const promoSuffix = promoValidation?.valid
          ? `_promo_${promoCode.trim().toUpperCase()}`
          : "";
        const telegramUrl =
          `https://t.me/${botUsername}?start=plan_${selectedPlan.id}${promoSuffix}`;
        window.open(telegramUrl, "_blank");
        toast.success("Redirecting to Telegram to complete purchase");
      } catch (error) {
        toast.error("Failed to initiate checkout");
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
        method: paymentMethod,
      };

      if (isTelegram && telegramInitData) {
        requestBody.initData = telegramInitData;
      } else if (telegramId) {
        requestBody.telegram_id = telegramId;
      }

      const { data, error } = await supabase.functions.invoke(
        "checkout-init",
        {
          body: requestBody,
        },
      );

      if (error) {
        throw new Error(error.message || "Failed to initialize payment");
      }

      setPaymentId(data.payment_id);
      if (data.instructions?.type === "bank_transfer") {
        setBankAccounts(data.instructions.banks || []);
      }
      setCurrentStep("instructions");
      toast.success("Payment initiated successfully");
    } catch (error: any) {
      logger.error("Checkout initiation failed", error);
      toast.error(error.message || "Failed to initiate checkout");
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile || !paymentId) return;
    setUploading(true);
    setUploadStatus("idle");
    try {
      const uploadRequestBody: Record<string, unknown> = {
        payment_id: paymentId,
        filename: uploadedFile.name,
        content_type: uploadedFile.type,
      };

      if (isTelegram && telegramInitData) {
        uploadRequestBody.initData = telegramInitData;
      }

      const { data: uploadData, error: uploadError } = await supabase.functions
        .invoke(
          "receipt-upload-url",
          {
            body: uploadRequestBody,
          },
        );

      if (uploadError) throw uploadError;
      if (!uploadData?.upload_url) {
        throw new Error("No upload URL received");
      }

      const uploadResponse = await fetch(uploadData.upload_url, {
        method: "PUT",
        body: uploadedFile,
        headers: {
          "Content-Type": uploadedFile.type,
          "x-amz-acl": "private",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const submitRequestBody: Record<string, unknown> = {
        payment_id: paymentId,
        file_path: uploadData.file_path,
        bucket: uploadData.bucket,
      };

      if (isTelegram && telegramInitData) {
        submitRequestBody.initData = telegramInitData;
      }

      const { error: submitError } = await supabase.functions.invoke(
        "receipt-submit",
        {
          body: submitRequestBody,
        },
      );

      if (submitError) throw submitError;
      setCurrentStep("pending");
      setUploadStatus("success");
      toast.success(
        "Receipt uploaded successfully! Your payment is being reviewed.",
      );
    } catch (error: any) {
      setUploadStatus("error");
      logger.error("Receipt upload failed", error);
      toast.error(error.message || "Failed to upload receipt");
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

  const isInitialLoading = plansLoading && !plansLoaded;

  if (isInitialLoading) {
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
      <div className="space-y-4">
        {plansError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load plans</AlertTitle>
            <AlertDescription>
              {plansError}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refresh(true)}
                >
                  Retry loading plans
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No plan selected. Please select a plan to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const plansExist = plans.length > 0;

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

        {plansError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load plans</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{plansError}</p>
              <Button size="sm" variant="outline" onClick={() => refresh(true)}>
                Retry loading plans
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
          <PlanSummary
            plan={selectedPlan}
            finalPrice={finalPrice}
            promoValidation={promoValidation}
          />

          <div className="space-y-4">
            {plansExist && plans.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Choose Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plans.map((plan) => {
                    const displayPrice = plan.pricing?.displayPrice ??
                      plan.price;
                    const formattedPrice = formatPrice(
                      displayPrice,
                      plan.currency,
                      "en-US",
                      {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      },
                    );
                    const isSelected = selectedPlan.id === plan.id;

                    return (
                      <Button
                        key={plan.id}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-between h-auto p-4"
                        onClick={() => {
                          if (plan.id !== selectedPlan.id) {
                            setSelectedPlan(plan);
                            setPromoValidation(null);
                          }
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">{plan.name}</div>
                          <div className="text-xs opacity-75">
                            {plan.is_lifetime
                              ? "Lifetime"
                              : `${plan.duration_months} months`}
                          </div>
                        </div>
                        <div className="font-bold">{formattedPrice}</div>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <PromoCodeForm
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              validatePromoCode={validatePromoCode}
              validatingPromo={validatingPromo}
              promoValidation={promoValidation}
              currency={planCurrency}
            />

            <Separator />

            {currentStep === "method" && (
              <PaymentMethodSelector
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                handleCheckout={handleCheckout}
                processingCheckout={processingCheckout}
                finalPrice={finalPrice}
                currency={planCurrency}
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

            {currentStep === "pending" && (
              <PendingReview paymentId={paymentId} />
            )}

            {currentStep === "method" && (
              <p className="text-xs text-center text-muted-foreground">
                By proceeding, you agree to our Terms of Service and Privacy
                Policy.
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
            promoCode={promoValidation?.valid ? promoCode : ""}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default WebCheckout;
