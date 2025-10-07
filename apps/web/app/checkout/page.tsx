import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { WebCheckout } from "@/components/checkout/WebCheckout";

type CheckoutPageSearchParams = {
  plan?: string;
  promo?: string;
};

type CheckoutPageProps = {
  searchParams?: Promise<CheckoutPageSearchParams>;
};

export const metadata = {
  title: "Checkout – Dynamic Capital",
  description:
    "Complete your Dynamic Capital VIP membership purchase and unlock the trading desk.",
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const selectedPlan = resolvedParams?.plan;
  const promoCode = resolvedParams?.promo;

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
      <WebCheckout selectedPlanId={selectedPlan} promoCode={promoCode} />
    </Column>
  );
}
