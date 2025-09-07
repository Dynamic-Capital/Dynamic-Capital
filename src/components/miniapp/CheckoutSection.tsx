import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InputField } from "@/components/ui/input-field";
import { 
  ShoppingCart, 
  Check, 
  Copy, 
  CreditCard, 
  Clock,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Upload
} from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { PaymentOptions } from "./PaymentOptions";
import { CurrencySelector } from "./CurrencySelector";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

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
  onBack: () => void;
}

export default function CheckoutSection({ selectedPlanId, promoCode, onBack }: CheckoutSectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { currency, setCurrency, exchangeRate } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initiatingCheckout, setInitiatingCheckout] = useState(false);
  const [step, setStep] = useState<"select" | "payment" | "instructions">("select");

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  useEffect(() => {
    // Fetch plans
    fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/plans')
      .then(res => res.json())
      .then(plansData => {
        setPlans(plansData.plans || []);
        
        if (selectedPlanId) {
          const plan = (plansData.plans || []).find((p: Plan) => p.id === selectedPlanId);
          setSelectedPlan(plan || null);
          setStep("payment");
        }
        
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedPlanId]);

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
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !paymentMethod) return;

    setInitiatingCheckout(true);
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/checkout-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          method: paymentMethod,
          currency,
          amount: getDisplayPrice(selectedPlan),
          initData: isInTelegram ? window.Telegram?.WebApp?.initData : undefined
        })
      });

      const data = await response.json();
      if (data.ok) {
        setPaymentInstructions(data.instructions);
        setStep("instructions");
        toast.success("Payment initiated! Follow the instructions below.");
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch (error) {
      toast.error("Failed to initiate checkout");
    } finally {
      setInitiatingCheckout(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (loading) {
    return (
      <MotionCard variant="glass" animate={true}>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">Loading checkout...</div>
        </CardContent>
      </MotionCard>
    );
  }

  return (
    <FadeInOnView>
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 overflow-x-auto pb-2">
          {[
            { key: "select", label: "Select Plan", icon: ShoppingCart },
            { key: "payment", label: "Payment Method", icon: CreditCard },
            { key: "instructions", label: "Payment Details", icon: FileText }
          ].map(({ key, label, icon: Icon }, index) => (
            <div key={key} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className={`p-1.5 sm:p-2 rounded-full ${
                step === key ? 'bg-primary text-primary-foreground' : 
                (key === "select" && step !== "select") || 
                (key === "payment" && step === "instructions") ? 'bg-green-500 text-white' : 
                'bg-muted text-muted-foreground'
              }`}>
                {((key === "select" && step !== "select") || (key === "payment" && step === "instructions")) ? 
                  <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Icon className="h-3 w-3 sm:h-4 sm:w-4" />}
              </div>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{label}</span>
              {index < 2 && <div className="w-4 sm:w-8 h-0.5 bg-muted flex-shrink-0" />}
            </div>
          ))}
        </div>

        {step === "select" && (
          <MotionCard variant="glass" hover={true} animate={true}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Select Your Plan
              </CardTitle>
              <CardDescription>Choose the VIP plan that suits your needs</CardDescription>
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
                    hover={true}
                    animate={true}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      selectedPlan?.id === plan.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                    }`}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {plan.is_lifetime ? 'Lifetime access' : `${plan.duration_months} months`}
                          </p>
                           {plan.features && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                              {plan.features.slice(0, 4).map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="truncate">{feature}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl sm:text-2xl font-bold text-primary">
                            {currency === "MVR" ? "Rf" : "$"}{getDisplayPrice(plan)}
                          </div>
                          <div className="text-xs text-muted-foreground">{currency}</div>
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
              onClick={() => setStep("select")}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plans
            </Button>

            <MotionCard variant="glass" hover={true} animate={true} delay={0.2}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Selected: {selectedPlan.name} - {currency === "MVR" ? "Rf" : "$"}{getDisplayPrice(selectedPlan)} {currency}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PaymentOptions 
                  selectedMethod={paymentMethod} 
                  onSelect={setPaymentMethod}
                  currency={currency}
                />

                {paymentMethod && (
                  <FadeInOnView>
                    <Button 
                      onClick={handleCheckout}
                      disabled={initiatingCheckout}
                      isLoading={initiatingCheckout}
                      className="w-full"
                      size="lg"
                    >
                      {initiatingCheckout ? "Processing..." : "Continue to Payment"}
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
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentInstructions.type === "bank_transfer" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Bank Transfer Instructions</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Transfer the exact amount to any of the bank accounts below, then upload your receipt.
                      </p>
                    </div>

                    {paymentInstructions.banks?.map((bank: any, index: number) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-3">{bank.bank_name}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Account Name:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{bank.account_name}</span>
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
                              <span className="text-sm text-muted-foreground">Account Number:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{bank.account_number}</span>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => copyToClipboard(bank.account_number)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Amount:</span>
                              <span className="font-bold text-primary">
                                {currency === "MVR" ? "Rf" : "$"}{getDisplayPrice(selectedPlan!)} {currency}
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
                        <span className="font-medium text-orange-900">Crypto Payment Instructions</span>
                      </div>
                      <p className="text-sm text-orange-700">
                        Send USDT to the address below (TRC20 network only), then upload your transaction receipt.
                      </p>
                    </div>

                    <Card className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">USDT (TRC20) Address</h4>
                        <div className="space-y-2">
                          <div className="p-3 bg-muted rounded font-mono text-sm break-all">
                            TEX7N2YKZX2KJR8HXRZ5WQGK5JFCGR7
                          </div>
                          <Button 
                            variant="outline"
                            onClick={() => copyToClipboard("TEX7N2YKZX2KJR8HXRZ5WQGK5JFCGR7")}
                            className="w-full"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Address
                          </Button>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm text-muted-foreground">Amount:</span>
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
                      <span className="font-medium text-green-900">Next Steps</span>
                    </div>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>1. Complete your payment using the details above</p>
                      <p>2. Take a screenshot/photo of your payment receipt</p>
                      <p>3. Upload the receipt through our bot for verification</p>
                      <p>4. You'll receive VIP access within 24 hours after verification</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1"
                    onClick={() => window.open('https://t.me/Dynamic_VIP_BOT', '_blank')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open('https://t.me/DynamicCapital_Support', '_blank')}
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