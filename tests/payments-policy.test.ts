import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";

type BankPayment = {
  id: string;
  status: "pending" | "completed";
  ocr: { amount: number; currency: string };
};

type CryptoPayment = {
  id: string;
  status: "pending" | "completed";
  confirmations: number;
};

interface UserSubscription {
  payment_id: string;
}

test("Bank transfer OCR auto-review", () => {
  const tolerance = 0.05; // 5%
  const planPrice = 100;
  const paymentOK: BankPayment = {
    id: "p2",
    status: "pending",
    ocr: { amount: 102, currency: "USD" },
  };
  const paymentBad: BankPayment = {
    id: "p3",
    status: "pending",
    ocr: { amount: 60, currency: "USD" },
  };
  function autoReview(p: BankPayment) {
    const within = Math.abs(p.ocr.amount - planPrice) <= planPrice * tolerance;
    if (within) p.status = "completed";
  }
  autoReview(paymentOK);
  autoReview(paymentBad);
  assertEquals(paymentOK.status, "completed");
  assertEquals(paymentBad.status, "pending");
});

test("Crypto payment auto-completes with confirmations", () => {
  const payment: CryptoPayment = {
    id: "p4",
    status: "pending",
    confirmations: 3,
  };
  const userSubs: UserSubscription[] = [];
  function cryptoWebhook(p: CryptoPayment) {
    if (p.confirmations >= 2) {
      p.status = "completed";
      userSubs.push({ payment_id: p.id });
    }
  }
  cryptoWebhook(payment);
  assertEquals(payment.status, "completed");
  assertEquals(userSubs.length, 1);
});
