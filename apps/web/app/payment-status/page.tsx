import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaymentStatus } from "@/components/receipts/PaymentStatus";

interface PaymentStatusPageProps {
  searchParams?: {
    payment_id?: string;
    status?: string;
    plan?: string;
  };
}

export const metadata: Metadata = {
  title: "Payment Status – Dynamic Capital",
  description:
    "Track the progress of your Dynamic Capital payment, review receipt uploads, and access next steps.",
};

const getStatusNotice = (status?: string, plan?: string) => {
  if (status !== "success") {
    return null;
  }

  return (
    <Alert className="border-green-500/20 bg-green-500/10">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-700">Payment initiated</AlertTitle>
      <AlertDescription className="text-green-700">
        {plan
          ? `We reserved your ${plan} membership. Upload your payment receipt below so our team can finish activating it.`
          : "Thanks for starting your membership. Upload your payment receipt below so our team can finish activating it."}
      </AlertDescription>
    </Alert>
  );
};

export default function PaymentStatusPage(
  { searchParams }: PaymentStatusPageProps,
) {
  const paymentId = searchParams?.payment_id;
  const status = searchParams?.status;
  const planParam = searchParams?.plan;

  let plan: string | undefined;
  if (typeof planParam === "string") {
    try {
      plan = decodeURIComponent(planParam);
    } catch (error) {
      plan = planParam;
    }
  }

  return (
    <Column gap="24" paddingY="40" align="center" horizontal="center" fillWidth>
      <Column maxWidth={32} gap="12" align="center" horizontal="center">
        <Heading variant="display-strong-s" align="center">
          Payment status
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          align="center"
        >
          Check the current state of your payment, upload proof of transfer, and
          follow the next steps for activation.
        </Text>
      </Column>

      <Column gap="16" fillWidth maxWidth={36}>
        {getStatusNotice(status, plan)}
        <PaymentStatus paymentId={paymentId} />
      </Column>
    </Column>
  );
}
