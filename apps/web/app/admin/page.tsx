import { Column } from "@/components/dynamic-ui-system";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminWorkspace } from "@/components/workspaces/AdminWorkspace";

export const metadata = {
  title: "Admin Dashboard – Dynamic Capital",
  description:
    "Monitor VIP members, payments, and bot health from the Dynamic Capital control room.",
};

export default function AdminPage() {
  return (
    <AdminWorkspace routeId="admin">
      <Column fillWidth>
        <AdminDashboard />
      </Column>
    </AdminWorkspace>
  );
}
