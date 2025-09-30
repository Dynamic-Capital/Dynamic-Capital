import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Loader2,
  Shield,
  Smartphone,
  Upload,
} from "lucide-react";
import { TouchFeedback } from "@/components/ui/mobile-gestures";
import { ThreeDEmoticon } from "@/components/ui/three-d-emoticons";
import { cn } from "@/lib/utils";
import {
  type PaymentMethodDefinition,
  type PaymentMethodId,
  paymentMethodMap,
} from "./paymentMethods";

interface MobilePaymentMethod extends PaymentMethodDefinition {
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  recommended?: boolean;
}

interface PaymentMethodPresentation {
  icon: React.ComponentType<{ className?: string }>;
  available?: boolean;
  recommended?: boolean;
  description?: string;
  processingTime?: string;
  fees?: string;
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

interface MobilePaymentFlowProps {
  selectedPlan?: Plan;
  onBack?: () => void;
  onComplete?: () => void;
  methodIds?: PaymentMethodId[];
  methodPresentation?: Partial<
    Record<PaymentMethodId, PaymentMethodPresentation>
  >;
}

const DEFAULT_METHOD_IDS: PaymentMethodId[] = [
  "bank_transfer",
  "mobile_banking",
  "crypto",
  "card",
];

const DEFAULT_METHOD_PRESENTATION: Record<
  PaymentMethodId,
  PaymentMethodPresentation
> = {
  bank_transfer: {
    icon: Building2,
    available: true,
    recommended: true,
  },
  mobile_banking: {
    icon: Smartphone,
    available: true,
  },
  crypto: {
    icon: Coins,
    available: true,
  },
  card: {
    icon: CreditCard,
    available: false,
  },
};

export const MobilePaymentFlow: React.FC<MobilePaymentFlowProps> = ({
  selectedPlan,
  onBack,
  onComplete,
  methodIds,
  methodPresentation,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [step, setStep] = useState<"method" | "instructions" | "confirmation">(
    "method",
  );
  const [uploadProgress, setUploadProgress] = useState(0);

  const isInTelegram = typeof window !== "undefined" && window.Telegram?.WebApp;

  const methodsToRender = useMemo(() => methodIds ?? DEFAULT_METHOD_IDS, [
    methodIds,
  ]);

  const combinedPresentation = useMemo(() => {
    if (!methodPresentation) {
      return DEFAULT_METHOD_PRESENTATION;
    }

    return methodsToRender.reduce<
      Record<PaymentMethodId, PaymentMethodPresentation>
    >(
      (acc, id) => {
        acc[id] = {
          ...DEFAULT_METHOD_PRESENTATION[id],
          ...(methodPresentation[id] ?? {}),
        };
        return acc;
      },
      {} as Record<PaymentMethodId, PaymentMethodPresentation>,
    );
  }, [methodPresentation, methodsToRender]);

  const paymentMethods = useMemo<MobilePaymentMethod[]>(() => {
    return methodsToRender
      .map<MobilePaymentMethod | null>((id) => {
        const definition = paymentMethodMap[id];
        const extras = combinedPresentation[id];

        if (!definition || !extras) {
          return null;
        }

        return {
          ...definition,
          icon: extras.icon ?? CreditCard,
          description: extras.description ?? definition.description,
          processingTime: extras.processingTime ?? definition.processingTime,
          fees: extras.fees ?? definition.fees,
          available: extras.available ?? true,
          recommended: extras.recommended ?? false,
        };
      })
      .filter((method): method is MobilePaymentMethod => method !== null);
  }, [combinedPresentation, methodsToRender]);

  const handleMethodSelect = (methodId: PaymentMethodId) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    if (!method?.available) {
      toast.error("This payment method is not available yet");
      return;
    }
    setSelectedMethod(methodId);
  };

  const handleProceedToPayment = async () => {
    if (!selectedMethod || !selectedPlan) return;

    setLoading(true);
    try {
      const { callEdgeFunction } = await import("@/config/supabase");
      const { data } = await callEdgeFunction("CHECKOUT_INIT", {
        method: "POST",
        body: {
          plan_id: selectedPlan.id,
          method: selectedMethod,
          currency: selectedPlan.currency,
          amount: selectedPlan.price,
          initData: isInTelegram
            ? window.Telegram?.WebApp?.initData
            : undefined,
        },
      });

      if ((data as any)?.ok) {
        setPaymentInstructions((data as any).instructions);
        setStep("instructions");
        toast.success("Payment instructions generated!");
      } else {
        toast.error(
          (data as any)?.error || "Failed to generate payment instructions",
        );
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment request");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const openTelegramBot = async () => {
    const { TELEGRAM_CONFIG } = await import("@/config/supabase");
    const url = TELEGRAM_CONFIG.BOT_URL;
    if (isInTelegram && typeof window !== "undefined") {
      // Check if Telegram WebApp is available
      const telegram = (window as any).Telegram;
      if (
        telegram?.WebApp?.openTelegramLink &&
        typeof telegram.WebApp.openTelegramLink === "function"
      ) {
        telegram.WebApp.openTelegramLink(url);
      } else {
        window.open(url, "_blank");
      }
    } else if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  const simulateUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep("confirmation");
          toast.success("Receipt uploaded successfully!");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  if (!selectedPlan) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No plan selected</p>
          <Button onClick={onBack} variant="outline" className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4 p-4">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6">
        {[
          { key: "method", label: "Method", icon: CreditCard },
          { key: "instructions", label: "Pay", icon: Shield },
          { key: "confirmation", label: "Done", icon: CheckCircle2 },
        ].map(({ key, label, icon: Icon }, index) => (
          <React.Fragment key={key}>
            <div className="flex flex-col items-center space-y-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  step === key
                    ? "bg-primary text-primary-foreground scale-110"
                    : (key === "method" && step !== "method") ||
                        (key === "instructions" && step === "confirmation")
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {((key === "method" && step !== "method") ||
                    (key === "instructions" && step === "confirmation"))
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <Icon className="h-4 w-4" />}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </div>
            {index < 2 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-all",
                  ((index === 0 && step !== "method") ||
                      (index === 1 && step === "confirmation"))
                    ? "bg-green-500"
                    : "bg-muted",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Selected Plan Summary */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ThreeDEmoticon emoji="💎" size={20} />
              <div>
                <h3 className="font-semibold text-sm">{selectedPlan.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedPlan.is_lifetime
                    ? "Lifetime access"
                    : `${selectedPlan.duration_months} months`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                ${selectedPlan.price}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedPlan.currency}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {step === "method" && (
          <motion.div
            key="method"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon as React.ComponentType<
                  { className?: string }
                >;
                return (
                  <TouchFeedback key={method.id}>
                    <motion.div
                      className={cn(
                        "relative p-4 rounded-lg border cursor-pointer transition-all duration-200",
                        selectedMethod === method.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/50",
                        !method.available && "opacity-50 cursor-not-allowed",
                      )}
                      onClick={() => handleMethodSelect(method.id)}
                      whileHover={{ scale: method.available ? 1.02 : 1 }}
                      whileTap={{ scale: method.available ? 0.98 : 1 }}
                    >
                      {method.recommended && (
                        <Badge className="absolute -top-2 right-2 bg-gradient-to-r from-orange-500 to-dc-brand text-white text-xs">
                          Popular
                        </Badge>
                      )}

                      <div className="flex items-center space-x-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            selectedMethod === method.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-sm">
                              {method.name}
                            </h3>
                            {!method.available && (
                              <Badge variant="outline" className="text-xs">
                                Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {method.description}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {method.processingTime}
                              </span>
                            </div>
                            <span className="text-xs text-green-600">
                              {method.fees}
                            </span>
                          </div>
                        </div>

                        {selectedMethod === method.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </motion.div>
                  </TouchFeedback>
                );
              })}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="flex-1 h-12"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleProceedToPayment}
                disabled={!selectedMethod || loading}
                className="flex-1 h-12"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <ArrowRight className="h-4 w-4 mr-2" />}
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {step === "instructions" && paymentInstructions && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {paymentInstructions.type === "bank_transfer" &&
              paymentInstructions.banks && (
              <div className="space-y-3">
                {paymentInstructions.banks.map((bank: any, index: number) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2 text-sm">
                        {bank.bank_name}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            Account:
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-xs">
                              {bank.account_name}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(bank.account_name)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            Number:
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-xs">
                              {bank.account_number}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(bank.account_number)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-xs text-muted-foreground">
                            Amount:
                          </span>
                          <span className="font-bold text-primary text-sm">
                            ${selectedPlan.price}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedMethod === "crypto" && paymentInstructions.address && (
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2 text-sm">USDT (TRC20)</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded font-mono text-xs break-all">
                      {paymentInstructions.address}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(paymentInstructions.address)}
                      className="w-full"
                      size="sm"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Address
                    </Button>
                    <div className="flex justify-between items-center pt-1 border-t">
                      <span className="text-xs text-muted-foreground">
                        Amount:
                      </span>
                      <span className="font-bold text-primary text-sm">
                        ${selectedPlan.price} USDT
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-blue-900">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                      <li>Transfer the exact amount</li>
                      <li>Screenshot your receipt</li>
                      <li>Upload via Telegram bot</li>
                      <li>Wait for approval (~24h)</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button
                onClick={() => setStep("method")}
                variant="outline"
                className="flex-1 h-12"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={openTelegramBot}
                className="flex-1 h-12"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt
              </Button>
            </div>
          </motion.div>
        )}

        {step === "confirmation" && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Receipt Uploaded!</h3>
              <p className="text-sm text-muted-foreground">
                Your payment is being reviewed. You'll get VIP access within 24
                hours.
              </p>
            </div>
            <Button
              onClick={onComplete}
              className="w-full h-12"
            >
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
