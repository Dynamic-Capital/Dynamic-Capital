"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, FileText } from "lucide-react";

interface PendingReviewProps {
  paymentId: string | null;
}

export const PendingReview: React.FC<PendingReviewProps> = ({ paymentId }) => (
  <div className="space-y-4">
    <Alert>
      <Clock className="h-4 w-4" />
      <AlertDescription>
        <strong>Payment Submitted!</strong>
        <br />
        Your receipt is being reviewed. You'll receive a Telegram notification
        once approved.
      </AlertDescription>
    </Alert>

    <div className="text-center space-y-2">
      <div className="text-sm text-muted-foreground">
        Payment ID: {paymentId}
      </div>
      <Button variant="outline" size="sm" asChild>
        <a
          href={`/payment-status?payment_id=${paymentId}`}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Check Status
        </a>
      </Button>
    </div>
  </div>
);

export default PendingReview;
