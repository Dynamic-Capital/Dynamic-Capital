"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  User,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callAdminFunction } from "@/utils/admin-client";
import { formatIsoDate, formatIsoTime } from "@/utils/isoFormat";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

interface Payment {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  payment_provider_id?: string;
  created_at: string;
  user: {
    telegram_id?: string;
    first_name?: string;
    last_name?: string;
  };
  plan: {
    name: string;
    duration_months: number;
    is_lifetime: boolean;
  };
}

export function PaymentReview() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { isAdmin } = useTelegramAuth();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          user:bot_users!inner(telegram_id, first_name, last_name),
          plan:subscription_plans!inner(name, duration_months, is_lifetime)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (
    paymentId: string,
    action: "approve" | "reject",
    notes?: string,
  ) => {
    try {
      setProcessing(paymentId);
      const { data: { user } } = await supabase.auth.getUser();

      if (!isAdmin) {
        throw new Error("No admin authentication available");
      }

      const { data, error } = await callAdminFunction("ADMIN_REVIEW_PAYMENT", {
        method: "POST",
        body: {
          payment_id: paymentId,
          decision: action,
          notes,
          admin_telegram_id: user?.user_metadata?.telegram_id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.status) {
        toast.success(`Payment ${action}d successfully`);
        fetchPayments();
        setSelectedPayment(null);
      } else {
        throw new Error((data as any)?.error || "Failed to process payment");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(`Failed to ${action} payment`);
    } finally {
      setProcessing(null);
    }
  };

  const viewReceipt = (payment: Payment) => {
    if (payment.payment_provider_id) {
      const { data } = supabase.storage
        .from("payment-receipts")
        .getPublicUrl(payment.payment_provider_id);

      if (data.publicUrl) {
        window.open(data.publicUrl, "_blank");
      }
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = !searchTerm ||
      payment.user.telegram_id?.includes(searchTerm) ||
      payment.user.first_name?.toLowerCase().includes(
        searchTerm.toLowerCase(),
      ) ||
      payment.user.last_name?.toLowerCase().includes(
        searchTerm.toLowerCase(),
      ) ||
      payment.id.includes(searchTerm);

    const matchesStatus = statusFilter === "all" ||
      payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />Pending
          </Badge>
        );
      case "pending_review":
        return (
          <Badge variant="outline">
            <Eye className="h-3 w-3 mr-1" />Under Review
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return <Building2 className="h-4 w-4" />;
      case "crypto":
        return <Coins className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Review</h2>
          <p className="text-muted-foreground">
            Review and manage payment submissions
          </p>
        </div>
        <Button onClick={fetchPayments} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user ID, name, or payment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="pending_review">Under Review</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="grid gap-4">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.payment_method)}
                      <span className="font-medium capitalize">
                        {payment.payment_method.replace("_", " ")}
                      </span>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">User</p>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">
                          {payment.user.first_name} {payment.user.last_name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ID: {payment.user.telegram_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Plan</p>
                      <p className="font-medium">{payment.plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.plan.is_lifetime
                          ? "Lifetime"
                          : `${payment.plan.duration_months} months`}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-bold text-lg">
                        {payment.amount} {payment.currency}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatIsoDate(payment.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatIsoTime(payment.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {payment.payment_provider_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewReceipt(payment)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Receipt
                    </Button>
                  )}

                  {payment.status === "pending_review" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          handlePaymentAction(payment.id, "approve")}
                        disabled={processing === payment.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSelectedPayment(payment)}
                        disabled={processing === payment.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPayments.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium">No payments found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "No payments match your current filters"
                    : "No payment submissions to review"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rejection Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Payment</CardTitle>
              <CardDescription>
                Please provide a reason for rejecting this payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter reason for rejection..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPayment(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const reason = (document.getElementById(
                      "rejection-reason",
                    ) as HTMLTextAreaElement)?.value;
                    handlePaymentAction(selectedPayment.id, "reject", reason);
                  }}
                  disabled={processing === selectedPayment.id}
                >
                  {processing === selectedPayment.id
                    ? "Processing..."
                    : "Reject Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
