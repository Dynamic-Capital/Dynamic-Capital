"use client";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import DynamicMarketReview from "@/components/tools/DynamicMarketReview";

export default function DynamicMarketReviewPage() {
  return (
    <Column gap="40" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={36} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Dynamic market review
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Get a consolidated view of FX momentum, volatility outliers, and
          cross-asset leadership to inform the next trading session in minutes.
        </Text>
      </Column>
      <DynamicMarketReview />
    </Column>
  );
}
