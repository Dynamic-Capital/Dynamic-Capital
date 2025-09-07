import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Coins, 
  Shield, 
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import { TouchFeedback } from "@/components/ui/mobile-gestures";
import { ThreeDEmoticon } from "@/components/ui/three-d-emoticons";
import { cn } from "@/lib/utils";

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

interface EnhancedPaymentSectionProps {
  selectedPlan?: Plan;
  onBack?: () => void;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: Building2,
    description: 'Direct bank transfer (MVR)',
    processing_time: '2-24 hours',
    available: true,
    recommended: true
  },
  {
    id: 'mobile_banking',
    name: 'Mobile Banking',
    icon: Smartphone,
    description: 'BML Mobile, Ooredoo Money',
    processing_time: 'Instant',
    available: true
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: Coins,
    description: 'USDT (TRC20)',
    processing_time: '10-30 minutes',
    available: true
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: CreditCard,
    description: 'Visa, Mastercard (Coming Soon)',
    processing_time: 'Instant',
    available: false
  }
];

export const EnhancedPaymentSection: React.FC<EnhancedPaymentSectionProps> = ({ 
  selectedPlan, 
  onBack 
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [step, setStep] = useState<'method' | 'instructions' | 'confirmation'>('method');

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  const handleMethodSelect = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (!method?.available) {
      toast.error('This payment method is not available yet');
      return;
    }
    setSelectedMethod(methodId);
  };

  const handleProceedToPayment = async () => {
    if (!selectedMethod || !selectedPlan) return;

    setLoading(true);
    try {
      const { callEdgeFunction } = await import('@/config/supabase');
      const response = await callEdgeFunction('CHECKOUT_INIT', {
        method: 'POST',
        body: {
          plan_id: selectedPlan.id,
          method: selectedMethod,
          currency: selectedPlan.currency,
          amount: selectedPlan.price,
          initData: isInTelegram ? window.Telegram?.WebApp?.initData : undefined
        }
      });

      const data = await response.json();
      if (data.ok) {
        setPaymentInstructions(data.instructions);
        setStep('instructions');
        toast.success("Payment instructions generated!");
      } else {
        toast.error(data.error || "Failed to generate payment instructions");
      }
    } catch (error) {
      console.error('Payment error:', error);
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
    const { TELEGRAM_CONFIG } = await import('@/config/supabase');
    window.open(TELEGRAM_CONFIG.BOT_URL, '_blank');
  };

  if (!selectedPlan) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No plan selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[
          { key: 'method', label: 'Payment Method', icon: CreditCard },
          { key: 'instructions', label: 'Instructions', icon: Shield },
          { key: 'confirmation', label: 'Complete', icon: CheckCircle2 }
        ].map(({ key, label, icon: Icon }, index) => (
          <div key={key} className="flex items-center space-x-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              step === key ? "bg-primary text-primary-foreground" :
              (key === 'method' && step !== 'method') ? "bg-green-500 text-white" :
              "bg-muted text-muted-foreground"
            )}>
              {(key === 'method' && step !== 'method') ? 
                <CheckCircle2 className="h-4 w-4" /> : 
                <Icon className="h-4 w-4" />
              }
            </div>
            <span className="text-sm font-medium hidden sm:block">{label}</span>
            {index < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Selected Plan Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ThreeDEmoticon emoji="💎" size={24} />
              <div>
                <h3 className="font-semibold">{selectedPlan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.is_lifetime ? 'Lifetime access' : `${selectedPlan.duration_months} months`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                ${selectedPlan.price}
              </div>
              <div className="text-sm text-muted-foreground">{selectedPlan.currency}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {step === 'method' && (
          <motion.div
            key="method"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Choose Payment Method</span>
                </CardTitle>
                <CardDescription>
                  Select your preferred payment method to complete your VIP subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <TouchFeedback key={method.id}>
                      <motion.div
                        className={cn(
                          "relative p-4 rounded-lg border cursor-pointer transition-all duration-200",
                          selectedMethod === method.id ? 
                            "border-primary bg-primary/5 ring-2 ring-primary/20" : 
                            "border-border hover:border-primary/50 hover:bg-muted/50",
                          !method.available && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => handleMethodSelect(method.id)}
                        whileHover={{ scale: method.available ? 1.02 : 1 }}
                        whileTap={{ scale: method.available ? 0.98 : 1 }}
                      >
                        {method.recommended && (
                          <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                            Recommended
                          </Badge>
                        )}
                        
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center",
                            selectedMethod === method.id ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Icon className="h-6 w-6" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{method.name}</h3>
                              {!method.available && (
                                <Badge variant="outline">Coming Soon</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                            <div className="flex items-center space-x-1 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{method.processing_time}</span>
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
              </CardContent>
            </Card>

            {selectedMethod && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Button
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Proceed to Payment
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 'instructions' && paymentInstructions && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Payment Instructions</span>
                </CardTitle>
                <CardDescription>
                  Follow these steps to complete your payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedMethod === 'crypto' && paymentInstructions.address && (
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-3">USDT (TRC20)</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted rounded font-mono text-sm break-all">
                          {paymentInstructions.address}
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => copyToClipboard(paymentInstructions.address)}
                          className="w-full"
                          size="sm"
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Address
                        </Button>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-muted-foreground">Amount:</span>
                          <span className="font-bold text-primary">${selectedPlan.price} USDT</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-blue-900">Next Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-700">
                          <li>Transfer the exact amount using the details above</li>
                          <li>Take a screenshot of your payment confirmation</li>
                          <li>Upload the receipt through our Telegram bot</li>
                          <li>Wait for admin approval (usually within 24 hours)</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={openTelegramBot}
                    variant="default"
                    className="h-12"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </Button>
                  <Button
                    onClick={() => setStep('method')}
                    variant="outline"
                    className="h-12"
                  >
                    Change Method
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};