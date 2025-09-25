import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  ArrowLeft,
  Upload,
  QrCode,
  Wallet,
  Flame
} from "lucide-react";
import { TouchFeedback } from "@/components/ui/mobile-gestures";
import { ThreeDEmoticon } from "@/components/ui/three-d-emoticons";
import { cn } from "@/lib/utils";
import type { CryptoInstructions } from "@/components/checkout/types";

type MiniMethodId = 'ton' | 'usdt_trc20' | 'dct';

interface MiniPaymentMethod {
  id: MiniMethodId;
  name: string;
  icon: React.ElementType;
  description: string;
  processing_time: string;
  available: boolean;
  recommended?: boolean;
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
}

const paymentMethods: MiniPaymentMethod[] = [
  {
    id: 'ton',
    name: 'TON Wallet',
    icon: Wallet,
    description: 'Pay directly from a TON wallet to trigger auto-invest routing.',
    processing_time: '≈1 minute',
    available: true,
    recommended: true,
    fees: 'Network fees apply'
  },
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC20)',
    icon: Coins,
    description: 'Bridge USDT on Tron; the contract swaps into TON automatically.',
    processing_time: '10-30 minutes',
    available: true,
    fees: 'Network fees apply'
  },
  {
    id: 'dct',
    name: 'Dynamic Capital Token (DCT)',
    icon: Flame,
    description: 'Stake DCT to extend VIP access and accrue governance weight.',
    processing_time: '≈1 minute',
    available: true,
    fees: 'No protocol fee'
  }
];

export const MobilePaymentFlow: React.FC<MobilePaymentFlowProps> = ({
  selectedPlan,
  onBack,
  onComplete
}) => {
  const [selectedMethod, setSelectedMethod] = useState<MiniMethodId | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<CryptoInstructions | null>(null);
  const [step, setStep] = useState<'method' | 'instructions' | 'confirmation'>('method');
  const [uploadProgress, setUploadProgress] = useState(0);

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  const selectedMethodMeta = selectedMethod
    ? paymentMethods.find((method) => method.id === selectedMethod)
    : null;

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
      const { data } = await callEdgeFunction('CHECKOUT_INIT', {
        method: 'POST',
        body: {
          plan_id: selectedPlan.id,
          method: selectedMethod,
          currency: selectedPlan.currency,
          amount: selectedPlan.price,
          initData: isInTelegram ? window.Telegram?.WebApp?.initData : undefined
        }
      });

      if ((data as any)?.ok) {
        setPaymentInstructions((data as any).instructions);
        setStep('instructions');
        toast.success("Payment instructions generated!");
      } else {
        toast.error((data as any)?.error || "Failed to generate payment instructions");
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
    const url = TELEGRAM_CONFIG.BOT_URL;
    if (isInTelegram && typeof window !== 'undefined') {
      // Check if Telegram WebApp is available
      const telegram = (window as any).Telegram;
      if (telegram?.WebApp?.openTelegramLink && typeof telegram.WebApp.openTelegramLink === 'function') {
        telegram.WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const simulateUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep('confirmation');
          toast.success('Receipt uploaded successfully!');
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
          { key: 'method', label: 'Method', icon: CreditCard },
          { key: 'instructions', label: 'Pay', icon: Shield },
          { key: 'confirmation', label: 'Done', icon: CheckCircle2 }
        ].map(({ key, label, icon: Icon }, index) => (
          <React.Fragment key={key}>
            <div className="flex flex-col items-center space-y-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step === key ? "bg-primary text-primary-foreground scale-110" :
                (key === 'method' && step !== 'method') || 
                (key === 'instructions' && step === 'confirmation') ? "bg-green-500 text-white" :
                "bg-muted text-muted-foreground"
              )}>
                {((key === 'method' && step !== 'method') || 
                  (key === 'instructions' && step === 'confirmation')) ? 
                  <CheckCircle2 className="h-4 w-4" /> : 
                  <Icon className="h-4 w-4" />
                }
              </div>
              <span className="text-xs font-medium">{label}</span>
            </div>
            {index < 2 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 transition-all",
                ((index === 0 && step !== 'method') || (index === 1 && step === 'confirmation')) ?
                "bg-green-500" : "bg-muted"
              )} />
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
                  {selectedPlan.is_lifetime ? 'Lifetime access' : `${selectedPlan.duration_months} months`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                ${selectedPlan.price}
              </div>
              <div className="text-xs text-muted-foreground">{selectedPlan.currency}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {step === 'method' && (
          <motion.div
            key="method"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon as React.ComponentType<{ className?: string }>;
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
                        <Badge className="absolute -top-2 right-2 bg-gradient-to-r from-orange-500 to-dc-brand text-white text-xs">
                          Popular
                        </Badge>
                      )}
                      
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          selectedMethod === method.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-sm">{method.name}</h3>
                            {!method.available && (
                              <Badge variant="outline" className="text-xs">Soon</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{method.processing_time}</span>
                            </div>
                            <span className="text-xs text-green-600">{method.fees}</span>
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
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'instructions' && paymentInstructions && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {selectedMethodMeta?.icon && (
                    <selectedMethodMeta.icon className="h-4 w-4" />
                  )}
                  <div>
                    <h4 className="font-semibold text-sm">
                      {selectedMethodMeta?.name ?? paymentInstructions.type.toUpperCase()}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Network: {paymentInstructions.network}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded font-mono text-xs break-all">
                  {paymentInstructions.address}
                </div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(paymentInstructions.address)}
                  className="w-full"
                  size="sm"
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy address
                </Button>
                {paymentInstructions.memo ? (
                  <p className="text-xs text-muted-foreground">
                    Memo: <span className="font-semibold">{paymentInstructions.memo}</span>
                  </p>
                ) : null}
                {paymentInstructions.note ? (
                  <p className="text-xs text-muted-foreground">
                    {paymentInstructions.note}
                  </p>
                ) : null}
                {(paymentInstructions.autoInvestSplit != null || paymentInstructions.burnSplit != null) && (
                  <div className="text-[0.65rem] text-muted-foreground">
                    {paymentInstructions.autoInvestSplit != null && (
                      <p>{paymentInstructions.autoInvestSplit}% routes to the auto-invest pool.</p>
                    )}
                    {paymentInstructions.burnSplit != null && (
                      <p>{paymentInstructions.burnSplit}% is burned to enhance DCT scarcity.</p>
                    )}
                  </div>
                )}
                {paymentInstructions.stakingContract && (
                  <div className="space-y-1 text-xs">
                    <p className="font-medium">Staking contract</p>
                    <div className="p-2 bg-muted rounded font-mono break-all">
                      {paymentInstructions.stakingContract}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-blue-900">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                      <li>Complete the transfer using the above details.</li>
                      <li>Upload your transaction receipt or TON explorer link.</li>
                      <li>Desk automation will verify on-chain and unlock access.</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button
                onClick={() => setStep('method')}
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

        {step === 'confirmation' && (
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
                Your payment is being reviewed. You'll get VIP access within 24 hours.
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