import { useSearchParams } from "react-router-dom";
import WebCheckout from "@/components/checkout/WebCheckout";

const Checkout = () => {
  const [params] = useSearchParams();
  const selectedPlanId = params.get("plan") || undefined;
  const promoCode = params.get("promo") || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="animate-fade-in">
        <WebCheckout selectedPlanId={selectedPlanId} promoCode={promoCode} />
      </div>
    </div>
  );
};

export default Checkout;

