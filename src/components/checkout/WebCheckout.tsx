import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  Shield, 
  Clock, 
  Users, 
  Sparkles, 
  Check,
  AlertCircle,
  Loader2,
  Upload,
  Building,
  Coins,
  ExternalLink,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/config/supabase";

// Remove duplicate interface - already defined in useTelegramAuth.tsx

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
}

interface WebCheckoutProps {
  selectedPlanId?: string;
  promoCode?: string;
}

type PaymentMethod = "bank_transfer" | "crypto" | "telegram";
type CheckoutStep = "method" | "instructions" | "upload" | "pending";

interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
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
  
  // Web checkout state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("telegram");
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("method");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await callEdgeFunction('PLANS');
      const data = await response.json();
      setPlans(data.plans || []);
      if (data.plans?.length > 0 && !selectedPlan) {
        setSelectedPlan(data.plans[0]);
      }
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  useEffect(() => {
    // Check if running inside Telegram
    const isInTelegram = window.Telegram?.WebApp?.initData;
    setIsTelegram(!!isInTelegram);
    if (isInTelegram) {
      setTelegramInitData(window.Telegram.WebApp.initData);
      console.log("Running inside Telegram WebApp");
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
      const response = await callEdgeFunction('PROMO_VALIDATE', {
        method: 'POST',
        body: {
          code: promoCode,
          plan_id: selectedPlan.id,
        },
      });

      const data = await response.json();
      setPromoValidation(data);
      
      if (data.valid) {
        toast.success(`Promo code applied! ${data.discount_type === 'percentage' ? data.discount_value + '%' : '$' + data.discount_value} discount`);
      } else {
        toast.error(data.reason || 'Invalid promo code');
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

    // Web checkout flow
    setProcessingCheckout(true);
    try {
      let telegramId: string | null = null;
      
      if (isTelegram && telegramInitData) {
        // Use Telegram initData for authentication
        console.log("Using Telegram initData for checkout");
      } else {
        // Fallback to Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          telegramId = user.user_metadata?.telegram_id || user.id;
        } else {
          // Create a guest user for checkout
          telegramId = crypto.randomUUID();
        }
      }

      // Create payment intent
      const requestBody: any = {
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
        console.error('Checkout init error:', error);
        throw new Error(error.message || 'Failed to initialize payment');
      }
      
      setPaymentId(data.payment_id);
      
      if (data.instructions?.type === "bank_transfer") {
        setBankAccounts(data.instructions.banks || []);
      }
      
      setCurrentStep("instructions");
      toast.success('Payment initiated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate checkout');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile || !paymentId) return;

    setUploading(true);
    try {
      // Get upload URL
      const uploadRequestBody: any = { 
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

      if (uploadError) throw uploadError;

      if (!uploadData?.upload_url) {
        throw new Error('No upload URL received');
      }

      // Upload file directly to the signed URL
      const uploadResponse = await fetch(uploadData.upload_url, {
        method: 'PUT',
        body: uploadedFile,
        headers: { 
          'Content-Type': uploadedFile.type,
          'x-amz-acl': 'private'
        }
      });

      if (!uploadResponse.ok) {
        console.error('Upload failed:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Submit receipt
      const submitRequestBody: any = { 
        payment_id: paymentId,
        file_path: uploadData.file_path,
        storage_bucket: uploadData.bucket
      };

      if (isTelegram && telegramInitData) {
        submitRequestBody.initData = telegramInitData;
      }

      const { error: submitError } = await supabase.functions.invoke('receipt-submit', {
        body: submitRequestBody
      });

      if (submitError) throw submitError;

      setCurrentStep("pending");
      toast.success('Receipt uploaded successfully! Your payment is being reviewed.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="mb-2">
          <Shield className="h-3 w-3 mr-1" />
          Secure Checkout
        </Badge>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Complete Your Purchase
        </h1>
        <p className="text-muted-foreground">
          Join thousands of traders using our premium tools
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {selectedPlan.name}
              </CardTitle>
              <CardDescription>
                {selectedPlan.is_lifetime ? 'Lifetime access' : `${selectedPlan.duration_months} month subscription`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-lg">
                <span>Price:</span>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    ${finalPrice.toFixed(2)}
                  </div>
                  {promoValidation?.valid && finalPrice !== selectedPlan.price && (
                    <div className="text-sm text-muted-foreground line-through">
                      ${selectedPlan.price}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedPlan.features && selectedPlan.features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Included features:</h4>
                  <div className="space-y-1">
                    {selectedPlan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <Shield className="w-5 h-5 mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">Secure</p>
                </div>
                <div className="space-y-1">
                  <Clock className="w-5 h-5 mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">Instant</p>
                </div>
                <div className="space-y-1">
                  <Users className="w-5 h-5 mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">5000+ Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checkout Form */}
        <div className="space-y-4">
          {/* Plan Selection */}
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

          {/* Promo Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Promo Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={validatePromoCode} 
                  disabled={!promoCode.trim() || validatingPromo}
                  size="sm"
                >
                  {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {promoValidation && (
                <div className={cn(
                  "text-xs p-2 rounded",
                  promoValidation.valid 
                    ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                    : "bg-dc-brand/10 text-dc-brand-dark border border-dc-brand/20"
                )}>
                  {promoValidation.valid 
                    ? `${promoValidation.discount_type === 'percentage' ? promoValidation.discount_value + '%' : '$' + promoValidation.discount_value} discount applied!`
                    : promoValidation.reason
                  }
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />
          
          {/* Payment Method Selection */}
          {currentStep === "method" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Choose Payment Method</CardTitle>
                  <CardDescription>Select how you'd like to complete your payment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
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
                {processingCheckout ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : paymentMethod === "telegram" ? (
                  <ExternalLink className="h-5 w-5 mr-2" />
                ) : (
                  <CreditCard className="h-5 w-5 mr-2" />
                )}
                {paymentMethod === "telegram" ? "Continue in Telegram" : `Pay with ${paymentMethod === "bank_transfer" ? "Bank Transfer" : "Crypto"}`} - ${finalPrice.toFixed(2)}
              </Button>
            </div>
          )}

          {/* Payment Instructions */}
          {currentStep === "instructions" && (
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Step 1:</strong> Complete your payment using the details below, then upload your receipt.
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
                          <div><strong>Account Name:</strong> {bank.account_name}</div>
                          <div><strong>Account Number:</strong> {bank.account_number}</div>
                          <div><strong>Currency:</strong> {bank.currency}</div>
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
                        Send payment to the crypto address provided via Telegram. Upload your transaction receipt below.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={() => setCurrentStep("upload")}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt
              </Button>
            </div>
          )}

          {/* File Upload */}
          {currentStep === "upload" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Payment Receipt
                  </CardTitle>
                  <CardDescription>
                    Upload a clear photo or screenshot of your payment confirmation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  
                  {uploadedFile && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
                    </div>
                  )}

                  <Button 
                    onClick={handleFileUpload}
                    disabled={!uploadedFile || uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? "Uploading..." : "Submit Receipt"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pending Review */}
          {currentStep === "pending" && (
            <div className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Payment Submitted!</strong><br />
                  Your receipt is being reviewed. You'll receive a Telegram notification once approved.
                </AlertDescription>
              </Alert>
              
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  Payment ID: {paymentId}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/payment-status?payment_id=${paymentId}`} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Check Status
                  </a>
                </Button>
              </div>
            </div>
          )}

          {currentStep === "method" && (
            <p className="text-xs text-center text-muted-foreground">
              By proceeding, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebCheckout;