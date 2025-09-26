import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import StatusPill from "../components/StatusPill";
import TopBar from "../components/TopBar";
import { useApi } from "../hooks/useApi";

interface SubscriptionStatus {
  is_vip: boolean;
  plan_name: string | null;
  subscription_end_date: string | null;
  days_remaining: number | null;
  payment_status: string | null;
  is_expired: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  is_lifetime: boolean;
  currency: string;
}

export default function Subscription() {
  const api = useApi();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSubscriptionStatus().then((data) => {
      setSubscription(data.subscription);
      setPlans(data.available_plans);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [api]);

  if (loading) {
    return (
      <div className="dc-screen">
        <TopBar title="My Subscription" />
        <div className="p-4 text-center text-dc-text-dim">Loading...</div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "VERIFIED";
      case "pending":
        return "AWAITING";
      default:
        return "REJECTED";
    }
  };

  return (
    <div className="dc-screen">
      <TopBar title="My Subscription" />

      {subscription?.is_vip
        ? (
          <GlassPanel>
            <div className="text-center mb-4">
              <div className="text-lg font-semibold text-dc-primary mb-2">
                {subscription.plan_name || "VIP Plan"}
              </div>
              <StatusPill
                status={getStatusColor(subscription.payment_status)}
              />
              <Link to="/vip-dashboard" className="mt-3 block">
                <PrimaryButton label="Open VIP Dashboard" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dc-text-dim">Status:</span>
                <span className="text-dc-text">
                  {subscription.is_expired ? "Expired" : "Active"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-dc-text-dim">Expires:</span>
                <span className="text-dc-text">
                  {formatDate(subscription.subscription_end_date)}
                </span>
              </div>

              {subscription.days_remaining !== null && (
                <div className="flex justify-between">
                  <span className="text-dc-text-dim">Days Remaining:</span>
                  <span
                    className={`font-medium ${
                      subscription.days_remaining < 7
                        ? "text-red-400"
                        : "text-dc-text"
                    }`}
                  >
                    {subscription.days_remaining}
                  </span>
                </div>
              )}
            </div>

            {subscription.is_expired && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="text-red-400 text-sm text-center">
                  Your subscription has expired. Renew to continue accessing VIP
                  features.
                </div>
              </div>
            )}
          </GlassPanel>
        )
        : (
          <GlassPanel>
            <div className="text-center">
              <div className="text-lg font-semibold text-dc-text mb-2">
                No Active Subscription
              </div>
              <div className="text-dc-text-dim text-sm mb-4">
                Subscribe to access VIP trading signals and premium features
              </div>
              <Link to="/plan">
                <PrimaryButton label="Choose Plan" />
              </Link>
            </div>
          </GlassPanel>
        )}

      {plans.length > 0 && (
        <div className="mt-4">
          <div className="text-dc-text font-medium mb-3">Available Plans</div>
          {plans.map((plan) => (
            <GlassPanel key={plan.id}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-dc-text">{plan.name}</div>
                  <div className="text-dc-text-dim text-sm">
                    {plan.is_lifetime
                      ? "Lifetime"
                      : `${plan.duration_months} months`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-dc-primary font-semibold">
                    ${plan.price}
                  </div>
                  <Link to="/plan">
                    <SecondaryButton label="Select" />
                  </Link>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link to="/me">
          <SecondaryButton label="Back to Account" />
        </Link>
      </div>
    </div>
  );
}
