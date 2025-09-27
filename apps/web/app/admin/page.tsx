import { Column, Heading, Text } from "@/components/dynamic-ui-system";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard – Dynamic Capital",
  description:
    "Monitor VIP members, payments, and bot health from the Dynamic Capital control room.",
};

export default function AdminPage() {
  return (
    <AdminGate>
      <Column
        gap="24"
        paddingY="32"
        align="center"
        horizontal="center"
        fillWidth
      >
        <Column maxWidth={28} gap="12" align="center" horizontal="center">
          <Heading variant="display-strong-s" align="center">
            Admin control room
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            Review payments, manage VIP seats, and operate the Telegram bot
            infrastructure.
          </Text>
        </Column>
        <AdminDashboard />
      </Column>
    </AdminGate>
  );
}
