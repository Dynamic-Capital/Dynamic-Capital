import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import TopBar from "../components/TopBar";
import { useApi } from "../hooks/useApi";

interface VipDashboardSummary {
  totalRevenue: number;
  avgDailyRevenue: number;
  trailingNewUsers: number;
  trailingInteractions: number;
  retentionRate: number | null;
  lastUpdated: string;
  lastInteractionAt: string | null;
}

interface VipDashboardTrendPoint {
  date: string;
  value: number;
}

interface VipDashboardAnalyticsPoint {
  date: string;
  new_users: number;
  total_users: number;
  revenue: number;
}

interface VipDashboardData {
  user: {
    is_vip: boolean;
    subscription_expires_at: string | null;
  };
  analytics: VipDashboardAnalyticsPoint[];
  recent_interactions: Array<{
    id: string;
    interaction_type: string;
    created_at: string;
  }>;
  summary?: VipDashboardSummary;
  trends?: {
    revenue: VipDashboardTrendPoint[];
    newUsers: VipDashboardTrendPoint[];
  };
  activityBreakdown?: Record<string, number>;
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

  if (!dashboardData) {
    return (
      <div className="dc-screen">
        <TopBar title="VIP Dashboard" />
        <GlassPanel>
          <div className="text-center text-dc-text-dim">
            No dashboard data is available yet.
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!dashboardData.user?.is_vip) {
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

  const { user } = dashboardData;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString();

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value || 0);

  const formatCount = (value: number) =>
    Math.round(value || 0).toLocaleString();

  const formatChange = (
    value: number,
    formatter: (value: number) => string,
  ) => {
    if (!Number.isFinite(value) || value === 0) return "0";
    const sign = value > 0 ? "+" : "−";
    return `${sign}${formatter(Math.abs(value))}`;
  };

  const TrendCard = ({
    title,
    trend,
    formatter,
  }: {
    title: string;
    trend: VipDashboardTrendPoint[];
    formatter: (value: number) => string;
  }) => {
    if (!trend?.length) return null;
    const first = trend[0];
    const last = trend[trend.length - 1];
    const change = last.value - first.value;
    const directionClass = change >= 0 ? "text-emerald-400" : "text-red-400";

    return (
      <div className="space-y-1 rounded-lg border border-dc-accent/10 bg-dc-card/60 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dc-text font-medium">{title}</span>
          <span className="text-dc-text">{formatter(last.value)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-dc-text-dim">
          <span>
            {formatDate(first.date)} → {formatDate(last.date)}
          </span>
          <span className={directionClass}>
            {formatChange(change, formatter)}
          </span>
        </div>
      </div>
    );
  };

  const summaryMetrics = useMemo(() => {
    if (!dashboardData?.summary) return [];
    return [
      {
        label: "Total revenue",
        value: formatCurrency(dashboardData.summary.totalRevenue),
      },
      {
        label: "Avg daily revenue",
        value: formatCurrency(dashboardData.summary.avgDailyRevenue),
      },
      {
        label: "New users (14d)",
        value: formatCount(dashboardData.summary.trailingNewUsers),
      },
      {
        label: "Interactions (10 latest)",
        value: formatCount(dashboardData.summary.trailingInteractions),
      },
    ];
  }, [dashboardData?.summary]);

  const retentionPercent = useMemo(() => {
    if (dashboardData?.summary?.retentionRate == null) return null;
    return Math.round(dashboardData.summary.retentionRate * 100);
  }, [dashboardData?.summary?.retentionRate]);

  const activityEntries = useMemo(() => {
    if (!dashboardData?.activityBreakdown) return [];
    return Object.entries(dashboardData.activityBreakdown)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [dashboardData?.activityBreakdown]);

  const isExpiringSoon = useMemo(() => {
    const expiresAt = dashboardData?.user.subscription_expires_at;
    if (!expiresAt) return false;
    const expiresInMs = new Date(expiresAt).getTime() - Date.now();
    return Number.isFinite(expiresInMs) &&
      expiresInMs < 7 * 24 * 60 * 60 * 1000;
  }, [dashboardData?.user.subscription_expires_at]);

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

        {user.subscription_expires_at && (
          <div className="mt-4 p-3 border border-dc-accent/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-dc-text-dim">Subscription expires:</span>
              <span
                className={`font-medium ${
                  isExpiringSoon ? "text-red-400" : "text-dc-text"
                }`}
              >
                {formatDate(user.subscription_expires_at)}
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

      {/* Performance Summary */}
      {summaryMetrics.length > 0 && dashboardData.summary && (
        <GlassPanel>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-dc-text font-medium">
                  Performance overview
                </div>
                <div className="text-xs text-dc-text-dim">
                  Updated {formatDateTime(dashboardData.summary.lastUpdated)}
                </div>
              </div>
              {retentionPercent != null && (
                <div className="inline-flex items-center rounded-full border border-dc-accent/40 bg-dc-card/60 px-3 py-1 text-xs text-dc-text">
                  Retention {retentionPercent}%
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {summaryMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-dc-accent/10 bg-dc-card/60 p-3"
                >
                  <div className="text-xs uppercase tracking-wide text-dc-text-dim">
                    {metric.label}
                  </div>
                  <div className="text-lg font-semibold text-dc-text">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
            {dashboardData.summary.lastInteractionAt && (
              <div className="text-xs text-dc-text-dim">
                Last interaction:{" "}
                {formatDateTime(dashboardData.summary.lastInteractionAt)}
              </div>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Momentum */}
      {(dashboardData.trends?.revenue?.length ||
        dashboardData.trends?.newUsers?.length) && (
        <GlassPanel>
          <div className="text-dc-text font-medium mb-3">Momentum</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TrendCard
              title="Revenue trend"
              trend={dashboardData.trends?.revenue ?? []}
              formatter={formatCurrency}
            />
            <TrendCard
              title="New users trend"
              trend={dashboardData.trends?.newUsers ?? []}
              formatter={formatCount}
            />
          </div>
        </GlassPanel>
      )}

      {/* Platform Analytics */}
      {dashboardData.analytics.length > 0 && (
        <GlassPanel>
          <div className="text-dc-text font-medium mb-3">
            Recent platform insights
          </div>
          <div className="space-y-3">
            {dashboardData.analytics.slice(0, 5).map((analytics) => (
              <div
                key={analytics.date}
                className="flex items-center justify-between rounded-lg border border-dc-accent/10 bg-dc-card/50 p-3"
              >
                <div>
                  <div className="text-xs text-dc-text-dim">
                    {formatDate(analytics.date)}
                  </div>
                  <div className="text-sm text-dc-text">
                    {analytics.new_users} new users
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-dc-text">
                    {formatCurrency(analytics.revenue)}
                  </div>
                  <div className="text-xs text-dc-text-dim">
                    Total users: {formatCount(analytics.total_users)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Activity Breakdown */}
      {activityEntries.length > 0 && (
        <GlassPanel>
          <div className="text-dc-text font-medium mb-3">
            Activity breakdown
          </div>
          <div className="space-y-2">
            {activityEntries.map((entry) => (
              <div
                key={entry.type}
                className="flex items-center justify-between rounded-lg border border-dc-accent/5 bg-dc-card/40 px-3 py-2 text-sm"
              >
                <span className="capitalize text-dc-text">
                  {entry.type.replace(/_/g, " ")}
                </span>
                <span className="text-dc-text-dim">
                  {formatCount(entry.count)}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Recent Activity */}
      {dashboardData.recent_interactions.length > 0 && (
        <GlassPanel>
          <div className="text-dc-text font-medium mb-3">
            Your recent activity
          </div>
          <div className="space-y-2">
            {dashboardData.recent_interactions.slice(0, 5).map((
              interaction,
            ) => (
              <div
                key={interaction.id}
                className="flex justify-between rounded-lg border border-dc-accent/5 bg-dc-card/40 px-3 py-2"
              >
                <span className="text-dc-text text-sm capitalize">
                  {interaction.interaction_type.replace(/_/g, " ")}
                </span>
                <span className="text-dc-text-dim text-xs">
                  {formatDateTime(interaction.created_at)}
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
