import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GlassRow from "../components/GlassRow";
import GlassPanel from "../components/GlassPanel";
import StatusPill from "../components/StatusPill";
import TopBar from "../components/TopBar";
import PrimaryButton from "../components/PrimaryButton";
import { useApi } from "../hooks/useApi";

interface Receipt {
  id: string;
  amount: number;
  status: "AWAITING" | "VERIFIED" | "REJECTED" | "REVIEW";
  created_at: string;
}

export default function Me() {
  const api = useApi();
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    api.getReceipts(5).then(setReceipts);
  }, [api]);

  return (
    <div className="dc-screen">
      <TopBar title="My Account" />

      {/* Subscription Quick Access */}
      <GlassPanel>
        <div className="text-center mb-3">
          <div className="text-lg font-semibold text-dc-text mb-2">
            VIP Subscription
          </div>
          <Link to="/subscription">
            <PrimaryButton label="View Subscription Details" />
          </Link>
        </div>
      </GlassPanel>

      {/* Recent Receipts */}
      <div className="mb-4">
        <div className="text-dc-text font-medium mb-3">Recent Receipts</div>
        {receipts.length === 0
          ? (
            <GlassPanel>
              <div className="text-center text-dc-text-dim">
                No receipts found
              </div>
            </GlassPanel>
          )
          : (
            receipts.map((r) => (
              <GlassRow
                key={r.id}
                left={
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      #{r.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-dc-text-dim">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                }
                right={
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">${r.amount}</span>
                    <StatusPill status={r.status} />
                  </div>
                }
              />
            ))
          )}
      </div>
    </div>
  );
}
