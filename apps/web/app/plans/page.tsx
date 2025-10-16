import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { VipPackagesSection } from "@/components/dynamic-portfolio/home/VipPackagesSection";
import { CheckoutCallout } from "@/components/dynamic-portfolio/home/CheckoutCallout";
import { PageShellVariant } from "@/components/layout/PageShell";

export const metadata = {
  title: "VIP Plans – Dynamic Capital",
  description:
    "Choose a Dynamic Capital VIP membership package and unlock the full trading desk experience.",
};

export default function PlansPage() {
  return (
    <>
      <PageShellVariant variant="workspace" />
      <Column gap="32" paddingY="40" horizontal="stretch" fillWidth>
        <Column maxWidth={36} gap="12" horizontal="stretch">
          <Heading variant="display-strong-s" align="start">
            VIP membership plans
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="start"
          >
            Explore live pricing, compare access levels, and move straight into
            checkout when you’re ready to join the desk.
          </Text>
        </Column>
        <VipPackagesSection />
        <CheckoutCallout />
      </Column>
    </>
  );
}
