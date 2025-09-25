import { useEffect, useState } from "react";
import GlassRow from "../components/GlassRow";
import ApproveButton from "../components/ApproveButton";
import RejectButton from "../components/RejectButton";
import TopBar from "../components/TopBar";
import GlassPanel from "../components/GlassPanel";
import { useApi } from "../hooks/useApi";

interface Receipt {
  id: string;
  amount: number;
  telegram_user_id?: string;
  created_at?: string;
  payment_method?: string;
}

export default function Admin() {
  const api = useApi();
  const [items, setItems] = useState<Receipt[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check admin status first
    api.checkAdminStatus()
      .then((data) => {
        setIsAdmin(data.is_admin);
        if (data.is_admin) {
          // Only load pending items if user is admin
          return api.getPending();
        }
        return [];
      })
      .then((pendingItems) => {
        setItems(pendingItems);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Admin check error:", err);
        setError("Failed to verify admin access");
        setLoading(false);
      });
  }, [api]);

  const handleApprove = async (id: string) => {
    try {
      await api.approve(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Approve error:", err);
      setError("Failed to approve item");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.reject(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Reject error:", err);
      setError("Failed to reject item");
    }
  };

  if (loading) {
    return (
      <div className="dc-screen">
        <TopBar title="Admin" />
        <GlassPanel>
          <div className="text-center text-dc-text-dim">
            Verifying admin access...
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="dc-screen">
        <TopBar title="Access Denied" />
        <GlassPanel>
          <div className="text-center">
            <div className="text-red-400 font-medium mb-2">Access Denied</div>
            <div className="text-dc-text-dim text-sm">
              You don't have admin privileges to access this area.
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="dc-screen">
      <TopBar title="Admin Dashboard" />

      {error && (
        <GlassPanel>
          <div className="text-red-400 text-sm text-center">{error}</div>
        </GlassPanel>
      )}

      <GlassPanel>
        <div className="text-center mb-4">
          <div className="text-lg font-semibold text-dc-primary">
            Pending Approvals
          </div>
          <div className="text-dc-text-dim text-sm">
            {items.length} items awaiting review
          </div>
        </div>
      </GlassPanel>

      {items.length === 0
        ? (
          <GlassPanel>
            <div className="text-center text-dc-text-dim">
              No pending items to review
            </div>
          </GlassPanel>
        )
        : (
          items.map((r) => (
            <GlassRow
              key={r.id}
              left={
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    #{r.id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-dc-text-dim">${r.amount}</span>
                  {r.payment_method && (
                    <span className="text-xs text-dc-text-dim">
                      {r.payment_method}
                    </span>
                  )}
                  {r.created_at && (
                    <span className="text-xs text-dc-text-dim">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              }
              right={
                <div className="flex gap-2">
                  <ApproveButton
                    label="Approve"
                    onClick={() => handleApprove(r.id)}
                  />
                  <RejectButton
                    label="Reject"
                    onClick={() => handleReject(r.id)}
                  />
                </div>
              }
            />
          ))
        )}
    </div>
  );
}
