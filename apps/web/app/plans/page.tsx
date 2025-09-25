import { Column, Heading, Text } from "@once-ui-system/core";

import { VipPackagesSection } from "@/components/magic-portfolio/home/VipPackagesSection";
import { CheckoutCallout } from "@/components/magic-portfolio/home/CheckoutCallout";
import { brand } from "@/config/brand";

export const metadata = {
  title: `VIP Plans – ${brand.identity.name}`,
  description:
    `Choose a ${brand.identity.name} VIP membership package and unlock the full trading desk experience.`,
};

export default function PlansPage() {
  return (
    <Column gap="32" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={28} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          VIP membership plans
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Explore live pricing, compare access levels, and move straight into
          checkout when you’re ready to join the desk.
        </Text>
      </Column>
      <VipPackagesSection />
      <CheckoutCallout />
    </Column>
  );
}
