import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  CreditCard,
  FileText,
  ShoppingCart,
  Upload,
} from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import {
  type PaymentOptionPresentation,
  PaymentOptions,
} from "./PaymentOptions";
import { CurrencySelector } from "./CurrencySelector";
import { useCurrency } from "@/hooks/useCurrency";
import { callEdgeFunction, CRYPTO_CONFIG } from "@/config/supabase";
import Image from "next/image";
import { type PaymentMethodId } from "./paymentMethods";
import { MiniWelcomeExperience } from "@/components/welcome/WelcomeExperience";
import { useToast } from "@/hooks/useToast";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

interface CheckoutSectionProps {
  selectedPlanId?: string;
  promoCode?: string;
  onBack?: () => void;
}

interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  [key: string]: unknown;
}

interface PaymentInstructionsBase {
  type: "bank_transfer" | "crypto";
  [key: string]: unknown;
}

interface BankTransferInstructions extends PaymentInstructionsBase {
  type: "bank_transfer";
  banks?: BankDetails[];
}

interface CryptoInstructions extends PaymentInstructionsBase {
  type: "crypto";
}

type PaymentInstructions = BankTransferInstructions | CryptoInstructions | null;

type PlansResponse = { plans: Plan[] };

type CheckoutInitResponse =
  | { ok: true; instructions: Exclude<PaymentInstructions, null> }
  | { ok: false; error?: string };

export default function CheckoutSection(
  { selectedPlanId, promoCode, onBack }: CheckoutSectionProps,
) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { currency, setCurrency, exchangeRate } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(
    null,
  );
  const [paymentInstructions, setPaymentInstructions] = useState<
    PaymentInstructions
  >(null);
  const [loading, setLoading] = useState(true);
  const [initiatingCheckout, setInitiatingCheckout] = useState(false);
  const [step, setStep] = useState<"select" | "payment" | "instructions">(
    "select",
  );
  const { toast: pushToast } = useToast();
  const [activePromoCode, setActivePromoCode] = useState<string | null>(
    promoCode ?? null,
  );

  const isInTelegram = typeof window !== "undefined" &&
    globalThis.Telegram?.WebApp;

  useEffect(() => {
    // Fetch plans
    callEdgeFunction<PlansResponse>("PLANS")
      .then(({ data }) => {
        const resolvedPlans = data?.plans ?? [];
        setPlans(resolvedPlans);

        if (selectedPlanId) {
          const plan = resolvedPlans.find((candidate) =>
            candidate.id === selectedPlanId
          );
          setSelectedPlan(plan || null);
          setStep("payment");
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedPlanId]);

  useEffect(() => {
    setActivePromoCode(promoCode ?? null);
  }, [promoCode]);

  type WelcomePlanKind = "monthly" | "lifetime" | "free";

  const handleWelcomePlanSelect = (planId: string, kind: WelcomePlanKind) => {
    if (kind === "free") {
      setSelectedPlan(null);
      setStep("payment");
      pushToast({
        title: "Free tour activated",
        description: "Explore the experience without payment requirements.",
        duration: 3000,
      });
      return;
    }

    const plan = plans.find((candidate) => candidate.id === planId);
    if (!plan) {
      pushToast({
        title: "Plan unavailable",
        description: "Please refresh or choose another plan option.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlan(plan);
    setStep("payment");
    pushToast({
      title: `${plan.name} selected`,
      description: "Review payment methods below to continue.",
      duration: 3000,
    });
  };

  const handlePromoApplied = (code: string) => {
    setActivePromoCode(code);
    pushToast({
      title: "Promo code applied",
      description: `${code} will be used during checkout.`,
      duration: 3000,
    });
  };

  const getDisplayPrice = (plan: Plan) => {
    const basePrice = plan.price;
    if (currency === "MVR") {
      return Math.round(basePrice * exchangeRate);
    }
    return basePrice;
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep("payment");
    pushToast({
      title: `${plan.name} selected`,
      description: "Scroll down to choose your preferred payment method.",
      duration: 3000,
    });
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !paymentMethod) return;

    setInitiatingCheckout(true);
    try {
      const { data, error } = await callEdgeFunction<CheckoutInitResponse>(
        "CHECKOUT_INIT",
        {
          method: "POST",
          body: {
            plan_id: selectedPlan.id,
            method: paymentMethod,
            currency,
            amount: getDisplayPrice(selectedPlan),
            promo_code: activePromoCode ?? undefined,
            initData: isInTelegram
              ? globalThis.Telegram?.WebApp?.initData
              : undefined,
          },
        },
      );
      if (data?.ok) {
        setPaymentInstructions(data.instructions);
        setStep("instructions");
        pushToast({
          title: "Payment initiated",
          description: "Follow the instructions below to complete your order.",
          duration: 4000,
        });
      } else {
        const errorMessage = data?.error ?? error?.message ??
          "Failed to initiate payment";
        pushToast({
          title: "Checkout failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (_error) {
      pushToast({
        title: "Checkout error",
        description: "Something went wrong while preparing payment.",
        variant: "destructive",
      });
    } finally {
      setInitiatingCheckout(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    pushToast({
      title: "Copied",
      description: "Details copied to your clipboard.",
      duration: 2500,
    });
  };

  const paymentOptionPresentation = useMemo<
    Partial<Record<PaymentMethodId, PaymentOptionPresentation>>
  >(() => ({
    bank_transfer: {
      icon: (
        <div className="flex items-center gap-1">
          <Image
            src="/icons/bank.svg"
            alt="Bank"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <div className="flex gap-1 text-xs">
            <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
              BML
            </span>
            <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">
              MIB
            </span>
          </div>
        </div>
      ),
      description: "Direct bank transfer - most secure",
      processingTime: "1-3 business days",
      isPopular: currency === "MVR",
    },
    crypto: {
      icon: (
        <div className="flex items-center gap-1">
          <Image
            src="/icons/usdt.svg"
            alt="USDT"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <Image
            src="/icons/trc20.svg"
            alt="TRC20"
            width={16}
            height={16}
            className="h-4 w-4"
          />
          <span className="text-xs text-green-600 font-medium">USDT</span>
        </div>
      ),
      description: "USDT (TRC20) - instant processing",
      processingTime: "5-30 minutes",
      isPopular: currency === "USD",
    },
  }), [currency]);

  if (loading) {
    return (
      <FadeInOnView>
        <div className="space-y-6">
          <MiniWelcomeExperience
            onSelectPlan={handleWelcomePlanSelect}
            onPromoApply={handlePromoApplied}
          />
          <MotionCard variant="glass" animate>
            <CardContent className="p-6 text-center">
              <div className="text-muted-foreground">Loading checkout...</div>
            </CardContent>
          </MotionCard>
        </div>
      </FadeInOnView>
    );
  }

  return (
    <FadeInOnView>
      <div className="space-y-6">
        <MiniWelcomeExperience
          onSelectPlan={handleWelcomePlanSelect}
          onPromoApply={handlePromoApplied}
        />
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 overflow-x-auto pb-2">
          {[
            { key: "select", label: "Select Plan", icon: ShoppingCart },
            { key: "payment", label: "Payment Method", icon: CreditCard },
            { key: "instructions", label: "Payment Details", icon: FileText },
          ].map(({ key, label, icon: Icon }, index) => (
            <div
              key={key}
              className="flex items-center gap-1 sm:gap-2 flex-shrink-0"
            >
              <div
                className={`p-1.5 sm:p-2 rounded-full ${
                  step === key
                    ? "bg-primary text-primary-foreground"
                    : (key === "select" && step !== "select") ||
                        (key === "payment" && step === "instructions")
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {((key === "select" && step !== "select") ||
                    (key === "payment" && step === "instructions"))
                  ? <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  : <Icon className="h-3 w-3 sm:h-4 sm:w-4" />}
              </div>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                {label}
              </span>
              {index < 2 && (
                <div className="w-4 sm:w-8 h-0.5 bg-muted flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {step === "select" && (
          <MotionCard variant="glass" hover animate>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Select Your Plan
              </CardTitle>
              <CardDescription>
                Choose the VIP plan that suits your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Currency</h4>
                <CurrencySelector value={currency} onChange={setCurrency} />
              </div>

              <MotionCardContainer staggerDelay={0.1}>
                {plans.map((plan) => (
                  <MotionCard
                    key={plan.id}
                    variant="interactive"
                    hover
                    animate
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      selectedPlan?.id === plan.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {plan.is_lifetime
                              ? "Lifetime access"
                              : `${plan.duration_months} months`}
                          </p>
                          {plan.features && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                              {plan.features.slice(0, 4).map((feature, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="truncate">{feature}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl sm:text-2xl font-bold text-primary">
                            {currency === "MVR" ? "Rf" : "$"}
                            {getDisplayPrice(plan)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {currency}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </MotionCard>
                ))}
              </MotionCardContainer>
            </CardContent>
          </MotionCard>
        )}

        {step === "payment" && selectedPlan && (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep("select");
                onBack?.();
              }}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plans
            </Button>

            <MotionCard variant="glass" hover animate delay={0.2}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Selected: {selectedPlan.name} -{" "}
                  {currency === "MVR" ? "Rf" : "$"}
                  {getDisplayPrice(selectedPlan)} {currency}
                </CardDescription>
                {activePromoCode && (
                  <Badge variant="secondary" className="mt-2 w-fit">
                    Promo applied: {activePromoCode}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <PaymentOptions
                  selectedMethod={paymentMethod}
                  onSelect={(method) => setPaymentMethod(method)}
                  presentation={paymentOptionPresentation}
                />

                {paymentMethod && (
                  <FadeInOnView>
                    <Button
                      onClick={handleCheckout}
                      disabled={initiatingCheckout}
                      isLoading={initiatingCheckout}
                      responsive
                      fullWidth
                      variant="premium"
                      size="lg"
                      className="min-h-[48px] touch-manipulation"
                    >
                      {initiatingCheckout
                        ? "Processing..."
                        : "Continue to Payment"}
                    </Button>
                  </FadeInOnView>
                )}
              </CardContent>
            </MotionCard>
          </div>
        )}

        {step === "instructions" && paymentInstructions && (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setStep("payment")}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payment Method
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Payment Instructions
                </CardTitle>
                <CardDescription>
                  Complete your payment using the details below
                </CardDescription>
                {activePromoCode && (
                  <Badge variant="secondary" className="mt-2 w-fit">
                    Promo applied: {activePromoCode}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentInstructions.type === "bank_transfer" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Bank Transfer Instructions
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Transfer the exact amount to any of the bank accounts
                        below, then upload your receipt.
                      </p>
                    </div>

                    {paymentInstructions.banks?.map((bank, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-3">
                            {bank.bank_name}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Account Name:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">
                                  {bank.account_name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    copyToClipboard(bank.account_name)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
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
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Amount:
                              </span>
                              <span className="font-bold text-primary">
                                {currency === "MVR" ? "Rf" : "$"}
                                {getDisplayPrice(selectedPlan!)} {currency}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {paymentInstructions.type === "crypto" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-900">
                          Crypto Payment Instructions
                        </span>
                      </div>
                      <p className="text-sm text-orange-700">
                        Send USDT to the address below (TRC20 network only),
                        then upload your transaction receipt.
                      </p>
                    </div>

                    <Card className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">
                          USDT (TRC20) Address
                        </h4>
                        <div className="space-y-2">
                          <div className="p-3 bg-muted rounded font-mono text-sm break-all">
                            {CRYPTO_CONFIG.USDT_TRC20_ADDRESS}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() =>
                              copyToClipboard(CRYPTO_CONFIG.USDT_TRC20_ADDRESS)}
                            className="w-full"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Address
                          </Button>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm text-muted-foreground">
                              Amount:
                            </span>
                            <span className="font-bold text-primary">
                              ${getDisplayPrice(selectedPlan!)} USDT
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-900">
                        Next Steps
                      </span>
                    </div>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>1. Complete your payment using the details above</p>
                      <p>2. Take a screenshot/photo of your payment receipt</p>
                      <p>
                        3. Upload the receipt through our bot for verification
                      </p>
                      <p>
                        4. You'll receive VIP access within 24 hours after
                        verification
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    responsive
                    fullWidth
                    variant="brand"
                    size="lg"
                    className="min-h-[48px] touch-manipulation flex-1"
                    onClick={() =>
                      globalThis.open(
                        "https://t.me/DynamicCapital_Support",
                        "_blank",
                      )}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </Button>
                  <Button
                    responsive
                    variant="outline"
                    size="lg"
                    className="min-h-[48px] touch-manipulation sm:flex-none sm:w-auto"
                    onClick={() =>
                      globalThis.open(
                        "https://t.me/DynamicCapital_Support",
                        "_blank",
                      )}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Need Help?
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </FadeInOnView>
  );
}
