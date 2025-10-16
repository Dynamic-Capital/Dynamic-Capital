import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { WebCheckout } from "@/components/checkout/WebCheckout";
import { PageShellVariant } from "@/components/layout/PageShell";
import { buildMetadata } from "@/lib/seo";

type CheckoutPageSearchParams = {
  plan?: string;
  promo?: string;
};

type CheckoutPageProps = {
  searchParams?: Promise<CheckoutPageSearchParams>;
};

const pagePath = "/checkout";

export const metadata = buildMetadata({
  title: "Checkout – Dynamic Capital",
  description:
    "Complete your Dynamic Capital VIP membership purchase and unlock the trading desk.",
  canonicalPath: pagePath,
});

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const selectedPlan = resolvedParams?.plan;
  const promoCode = resolvedParams?.promo;

  return (
    <>
      <PageShellVariant variant="workspace" />
      <Column gap="24" paddingY="40" horizontal="stretch" fillWidth>
        <Column maxWidth={32} gap="12" horizontal="stretch">
          <Heading variant="display-strong-s" align="start">
            Secure checkout
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="start"
          >
            Review your plan, select a payment method, and submit proof if
            you’re joining via bank transfer or crypto.
          </Text>
        </Column>
        <WebCheckout selectedPlanId={selectedPlan} promoCode={promoCode} />
      </Column>
    </>
  );
}
