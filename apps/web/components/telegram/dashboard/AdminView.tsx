import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ViewHeader } from "./ViewHeader";

interface AdminViewProps {
  onBack: () => void;
}

export function AdminView({ onBack }: AdminViewProps) {
  return (
    <div className="space-y-6">
      <ViewHeader
        title="Admin Dashboard"
        description="Full access to bot settings, content, and tables"
        onBack={onBack}
      />
      <AdminDashboard />
    </div>
  );
}
