import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Column, Heading, Text } from "@/components/dynamic-ui-system";
import { WebCheckout } from "@/components/checkout/WebCheckout";

function useCheckoutParams() {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const plan = params.get("plan") || undefined;
    const promo = params.get("promo") || undefined;

    return { plan, promo };
  }, [location.search]);
}

export function CheckoutPage() {
  const { plan, promo } = useCheckoutParams();

  return (
    <Column gap="24" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={28} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Secure checkout
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Review your plan, select a payment method, and submit proof if you’re
          joining via bank transfer or crypto.
        </Text>
      </Column>
      <WebCheckout selectedPlanId={plan} promoCode={promo} />
    </Column>
  );
}

export default CheckoutPage;
