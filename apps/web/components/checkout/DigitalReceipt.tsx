"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "@/lib/lucide";
import type { Plan } from "@/types/plan";

interface DigitalReceiptProps {
  plan: Plan | null;
  finalPrice: number;
  promoCode: string;
  onClose: () => void;
}

export const DigitalReceipt: React.FC<DigitalReceiptProps> = (
  { plan, finalPrice, promoCode, onClose },
) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    lastFocused.current = document.activeElement as HTMLElement;
    buttonRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      lastFocused.current?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
        aria-describedby="receipt-desc"
      >
        <Card className="w-80">
          <CardHeader>
            <CardTitle id="receipt-title" className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Digital Receipt
            </CardTitle>
          </CardHeader>
          <CardContent id="receipt-desc" className="space-y-2 text-sm">
            <div>
              <strong>Plan:</strong> {plan?.name}
            </div>
            <div>
              <strong>Amount:</strong> ${finalPrice.toFixed(2)}
            </div>
            {promoCode && (
              <div>
                <strong>Promo:</strong> {promoCode}
              </div>
            )}
            <Button ref={buttonRef} className="mt-4 w-full" onClick={onClose}>
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default DigitalReceipt;
