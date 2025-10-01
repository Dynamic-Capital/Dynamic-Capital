import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import GlassPanel from "../components/GlassPanel";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import Toast from "../components/Toast";
import { functionUrl } from "../lib/edge";
import { useTelegramMainButton } from "../hooks/useTelegram";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
}

type Instructions =
  | { type: "bank_transfer"; banks: BankAccount[] }
  | { type: string; note: string };

export default function Plan() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [method, setMethod] = useState<"bank_transfer" | "crypto">(
    "bank_transfer",
  );
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState<any>(null);
  const [toast, setToast] = useState<
    { message: string; type: "success" | "warn" | "error" } | null
  >(null);

  useEffect(() => {
    const url = functionUrl("plans");
    if (!url) return;
    fetch(url)
      .then((res) => res.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => setPlans([]));

    // Check for preselected plan in URL
    const urlParams = new URLSearchParams(globalThis.location.search);
    const planParam = urlParams.get("plan");
    if (planParam) {
      setSelected(planParam);
    }
  }, []);

  const getTelegramId = () => {
    try {
      const tgId = (globalThis as unknown as {
        Telegram?: {
          WebApp?: { initDataUnsafe?: { user?: { id?: unknown } } };
        };
      }).Telegram?.WebApp?.initDataUnsafe?.user?.id;
      return String(tgId || "");
    } catch {
      return "";
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !selected) return;

    try {
      const res = await fetch(functionUrl("promo-validate")!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode,
          telegram_id: getTelegramId(),
          plan_id: selected,
        }),
      });
      const data = await res.json();
      setPromoValidation(data);

      if (data.valid) {
        setToast({
          message: `Promo applied! $${data.final_amount} final amount`,
          type: "success",
        });
      } else {
        setToast({
          message: data.reason || "Invalid promo code",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Failed to validate promo code", type: "error" });
    }
  };

  const handleCheckout = async () => {
    const url = functionUrl("checkout-init");
    if (!url || !selected) return;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: getTelegramId(),
          plan_id: selected,
          method,
        }),
      });
      if (!res.ok) {
        setToast({ message: "Failed to initialize checkout", type: "error" });
        return;
      }
      const json = await res.json().catch(() => null);
      if (json?.ok) {
        setPaymentId(json.payment_id);
        setInstructions(json.instructions as Instructions);

        // If promo code was validated, redeem it
        if (promoValidation?.valid && promoCode) {
          try {
            await fetch(functionUrl("promo-redeem")!, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: promoCode,
                telegram_id: getTelegramId(),
                plan_id: selected,
                payment_id: json.payment_id,
              }),
            });
          } catch {
            // Silent fail for promo redemption
          }
        }
      } else {
        setToast({
          message: json?.error || "Failed to initialize checkout",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Failed to initialize checkout", type: "error" });
    }
  };

  useTelegramMainButton(!!selected && !instructions, "Confirm", handleCheckout);

  return (
    <div className="dc-screen">
      <TopBar title="Choose Plan" />
      {!instructions && (
        <div className="space-y-4">
          {/* Promo Code Section */}
          {selected && (
            <GlassPanel>
              <div className="space-y-2">
                <div className="text-sm font-medium">Promo Code</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent border border-white/20 rounded text-sm"
                  />
                  <SecondaryButton
                    label="Apply"
                    onClick={validatePromoCode}
                    disabled={!promoCode.trim()}
                  />
                </div>
                {promoValidation && (
                  <div
                    className={`text-xs p-2 rounded ${
                      promoValidation.valid
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {promoValidation.valid
                      ? `Discount applied! Final amount: $${promoValidation.final_amount}`
                      : promoValidation.reason}
                  </div>
                )}
              </div>
            </GlassPanel>
          )}

          {plans.map((p) => (
            <GlassPanel
              key={p.id}
              className={`cursor-pointer${
                selected === p.id ? " ring-1 ring-primary" : ""
              }`}
              onClick={() => setSelected(p.id)}
            >
              <div className="flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-sm">
                  {promoValidation?.valid && selected === p.id
                    ? `$${promoValidation.final_amount}`
                    : `$${p.price}`} {p.currency}
                  {promoValidation?.valid && selected === p.id && (
                    <span className="ml-2 text-xs line-through opacity-60">
                      ${p.price}
                    </span>
                  )}
                </span>
              </div>
            </GlassPanel>
          ))}
          <div className="flex gap-2">
            <SecondaryButton
              label="Bank"
              onClick={() => setMethod("bank_transfer")}
              className={method === "bank_transfer"
                ? "opacity-100"
                : "opacity-60"}
            />
            <SecondaryButton
              label="Crypto"
              onClick={() => setMethod("crypto")}
              className={method === "crypto" ? "opacity-100" : "opacity-60"}
            />
          </div>
          <PrimaryButton
            label="Confirm"
            onClick={handleCheckout}
            disabled={!selected || !!instructions}
            className="mt-4"
          />
        </div>
      )}
      {instructions && (
        <div className="space-y-4">
          {"banks" in instructions
            ? (
              <div className="space-y-2">
                {instructions.banks.map((b: BankAccount, idx: number) => (
                  <GlassPanel key={idx} className="text-sm">
                    <p className="font-medium">{b.bank_name}</p>
                    <p>Account Name: {b.account_name}</p>
                    <p>Account Number: {b.account_number}</p>
                    <p>Currency: {b.currency}</p>
                  </GlassPanel>
                ))}
              </div>
            )
            : <GlassPanel className="text-sm">{instructions.note}</GlassPanel>}
          {paymentId && (
            <PrimaryButton
              label="View Status"
              onClick={() => {
                globalThis.location.href = `/status?payment_id=${paymentId}`;
              }}
            />
          )}
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
