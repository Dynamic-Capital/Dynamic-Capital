import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import TopBar from "../components/TopBar";
import { useApi } from "../hooks/useApi";

interface VipDashboardData {
  user: {
    is_vip: boolean;
    subscription_expires_at: string | null;
  };
  analytics: Array<{
    date: string;
    new_users: number;
    total_users: number;
    revenue: number;
  }>;
  recent_interactions: Array<{
    id: string;
    interaction_type: string;
    created_at: string;
  }>;
}

export default function VipDashboard() {
  const api = useApi();
  const [dashboardData, setDashboardData] = useState<VipDashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getVipDashboard()
      .then((data) => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load VIP dashboard");
        setLoading(false);
      });
  }, [api]);

  if (loading) {
    return (
      <div className="dc-screen">
        <TopBar title="VIP Dashboard" />
        <div className="p-4 text-center text-dc-text-dim">
          Loading your VIP dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dc-screen">
        <TopBar title="VIP Dashboard" />
        <GlassPanel>
          <div className="text-center">
            <div className="text-red-400 mb-4">{error}</div>
            <Link to="/me">
              <SecondaryButton label="Back to Account" />
            </Link>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!dashboardData?.user.is_vip) {
    return (
      <div className="dc-screen">
        <TopBar title="VIP Dashboard" />
        <GlassPanel>
          <div className="text-center">
            <div className="text-lg font-semibold text-dc-text mb-2">
              VIP Access Required
            </div>
            <div className="text-dc-text-dim text-sm mb-4">
              Subscribe to a VIP plan to access the dashboard
            </div>
            <Link to="/plan">
              <PrimaryButton label="Upgrade to VIP" />
            </Link>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpiringSoon = dashboardData.user.subscription_expires_at &&
    new Date(dashboardData.user.subscription_expires_at).getTime() -
          Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="dc-screen">
      <TopBar title="VIP Dashboard" />

      {/* VIP Status */}
      <GlassPanel>
        <div className="text-center mb-4">
          <div className="text-lg font-semibold text-dc-primary mb-2">
            🎖️ VIP Member
          </div>
          <div className="text-dc-text-dim text-sm">
            Welcome to your exclusive VIP dashboard
          </div>
        </div>

        {dashboardData.user.subscription_expires_at && (
          <div className="mt-4 p-3 border border-dc-accent/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-dc-text-dim">Subscription expires:</span>
              <span
                className={`font-medium ${
                  isExpiringSoon ? "text-red-400" : "text-dc-text"
                }`}
              >
                {formatDate(dashboardData.user.subscription_expires_at)}
              </span>
            </div>
            {isExpiringSoon && (
              <div className="mt-2 text-red-400 text-sm text-center">
                ⚠️ Expires soon! Renew to continue VIP access
              </div>
            )}
          </div>
        )}
      </GlassPanel>

      {/* Quick Actions */}
      <GlassPanel>
        <div className="text-dc-text font-medium mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/subscription">
            <SecondaryButton label="My Subscription" />
          </Link>
          <Link to="/contact">
            <SecondaryButton label="VIP Support" />
          </Link>
        </div>
      </GlassPanel>

      {/* Platform Analytics */}
      {dashboardData.analytics.length > 0 && (
        <GlassPanel>
          <div className="text-dc-text font-medium mb-3">Platform Insights</div>
          <div className="space-y-3">
            {dashboardData.analytics.slice(0, 5).map((analytics, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-dc-text-dim text-sm">
                  {formatDate(analytics.date)}
                </span>
                <div className="text-right">
                  <div className="text-dc-text text-sm">
                    {analytics.new_users} new users
                  </div>
                  <div className="text-dc-text-dim text-xs">
                    ${analytics.revenue.toFixed(2)} revenue
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Recent Activity */}
      {dashboardData.recent_interactions.length > 0 && (
        <GlassPanel>
          <div className="text-dc-text font-medium mb-3">
            Your Recent Activity
          </div>
          <div className="space-y-2">
            {dashboardData.recent_interactions.slice(0, 5).map((
              interaction,
            ) => (
              <div
                key={interaction.id}
                className="flex justify-between items-center"
              >
                <span className="text-dc-text text-sm capitalize">
                  {interaction.interaction_type.replace("_", " ")}
                </span>
                <span className="text-dc-text-dim text-xs">
                  {formatDate(interaction.created_at)}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Navigation */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/me">
          <SecondaryButton label="Account" />
        </Link>
        <Link to="/home">
          <PrimaryButton label="Home" />
        </Link>
      </div>
    </div>
  );
}
