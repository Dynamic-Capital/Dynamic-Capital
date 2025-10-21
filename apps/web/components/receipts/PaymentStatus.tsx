"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  Loader2,
  Receipt,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReceiptUploader from "./ReceiptUploader";
import { formatIsoDate } from "@/utils/isoFormat";

interface PaymentStatusProps {
  paymentId?: string;
}

interface PaymentWebhookData {
  storage_path?: string | null;
  ocr?: unknown;
  [key: string]: unknown;
}

interface SubscriptionPlan {
  name: string;
  duration_months: number;
  is_lifetime: boolean;
}

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  plan: {
    name: string;
    duration_months: number;
    is_lifetime: boolean;
  };
  webhook_data?: PaymentWebhookData;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({ paymentId }) => {
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const fetchPaymentStatus = useCallback(async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from<{
          id: string;
          amount: number;
          currency: string;
          status: string;
          payment_method: string;
          created_at: string;
          webhook_data: PaymentWebhookData | null;
          subscription_plans:
            | SubscriptionPlan
            | SubscriptionPlan[]
            | null;
        }>("payments")
        .select(`
          id,
          amount,
          currency,
          status,
          payment_method,
          created_at,
          webhook_data,
          subscription_plans:plan_id (
            name,
            duration_months,
            is_lifetime
          )
        `)
        .eq("id", paymentId)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Payment not found");

      const planData = Array.isArray(data.subscription_plans)
        ? data.subscription_plans[0]
        : data.subscription_plans;
      const plan: SubscriptionPlan = planData ?? {
        name: "Custom plan",
        duration_months: 0,
        is_lifetime: false,
      };

      const paymentData: PaymentData = {
        ...data,
        plan,
        webhook_data: data.webhook_data ?? undefined,
      };

      setPayment(paymentData);

      // Show uploader if payment is pending and no receipt uploaded yet
      const webhookData = data.webhook_data ?? undefined;
      const needsResubmit = ["pending_review", "failed"].includes(data.status);
      setShowUploader(
        (data.status === "pending" && !webhookData?.storage_path) ||
          needsResubmit,
      );
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Failed to fetch payment status";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchPaymentStatus();
  }, [fetchPaymentStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
      case "pending_review":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-dc-brand" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            Pending Review
          </Badge>
        );
      case "pending_review":
        return <Badge variant="outline">Manual Review</Badge>;
      case "failed":
        return (
          <Badge className="bg-dc-brand/10 text-dc-brand-dark border-dc-brand/20">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!paymentId) {
    return (
      <Alert>
        <AlertDescription>
          No payment ID provided. Please check your payment link or try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading && !payment) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading payment status...
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <Alert>
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Payment not found. Please check your payment ID or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(payment.status)}
              Payment Status
            </div>
            {getStatusBadge(payment.status)}
          </CardTitle>
          <CardDescription>
            Payment ID: {payment.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Plan
              </div>
              <div className="font-medium">{payment.plan.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Amount
              </div>
              <div className="font-medium">
                ${payment.amount} {payment.currency}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Payment Method
              </div>
              <div className="font-medium capitalize">
                {payment.payment_method.replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Created
              </div>
              <div className="font-medium">
                {formatIsoDate(payment.created_at)}
              </div>
            </div>
          </div>

          {payment.status === "completed" && (
            <Alert className="border-green-500/20 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                <strong>Payment Successful!</strong> Your {payment.plan.name}
                {" "}
                plan is now active.
              </AlertDescription>
            </Alert>
          )}

          {payment.status === "pending" && (
            <Alert className="border-yellow-500/20 bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-600">
                <strong>Payment Under Review</strong>
                {payment.webhook_data?.storage_path
                  ? " Your receipt has been uploaded and is being processed."
                  : " Please upload your payment receipt to continue."}
              </AlertDescription>
            </Alert>
          )}

          {payment.status === "pending_review" && (
            <Alert className="border-yellow-500/20 bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-600">
                <strong>Manual Review Required</strong>{" "}
                Our team will check your payment. You may re-upload your receipt
                if needed.
              </AlertDescription>
            </Alert>
          )}

          {payment.status === "failed" && (
            <Alert className="border-dc-brand/20 bg-dc-brand/10">
              <XCircle className="h-4 w-4 text-dc-brand-dark" />
              <AlertDescription className="text-dc-brand-dark">
                <strong>Payment Failed</strong>{" "}
                Please try again or contact support for assistance.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchPaymentStatus}
              disabled={loading}
              size="sm"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh Status
            </Button>

            {payment.webhook_data?.ocr && (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="cursor-default"
              >
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  OCR Processed
                </span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showUploader && (
        <ReceiptUploader
          paymentId={payment.id}
          onUploadComplete={(success) => {
            if (success) {
              setShowUploader(false);
              fetchPaymentStatus();
            }
          }}
        />
      )}
    </div>
  );
};

export default PaymentStatus;
