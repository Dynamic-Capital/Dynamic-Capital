"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/miniapp/Skeleton";
import { Toast } from "@/components/miniapp/Toast";
import { haptic } from "@/lib/telegram";
import { track } from "@/lib/metrics";

interface Insight {
  label: string;
  value: string;
  delta: string;
}

const placeholders: Insight[] = [
  { label: "Daily ROI", value: "--", delta: "--" },
  { label: "Signal Accuracy", value: "--", delta: "--" },
  { label: "VIP Retention", value: "--", delta: "--" },
];

const readyData: Insight[] = [
  { label: "Daily ROI", value: "+8.4%", delta: "▲ 1.2% vs yesterday" },
  { label: "Signal Accuracy", value: "92%", delta: "▲ 4% vs 7d avg" },
  { label: "VIP Retention", value: "87%", delta: "▲ 2% this month" },
];

export default function HomeTab() {
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  const data = loading ? placeholders : readyData;

  return (
    <>
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(48, 194, 242, 0.12)",
              color: "var(--tg-accent)",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Welcome back</h2>
            <p className="muted" style={{ margin: 0 }}>
              Your trading pulse syncs with Telegram in real-time.
            </p>
          </div>
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          {data.map((insight) => (
            <div
              key={insight.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{insight.label}</div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  {loading ? <Skeleton h={12} w={120} /> : insight.delta}
                </p>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>
                {loading ? <Skeleton h={18} w={72} /> : insight.value}
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn"
          onClick={() => {
            haptic("medium");
            void track("home_refresh");
            setShowToast(true);
            setLoading(true);
            window.setTimeout(() => setLoading(false), 750);
          }}
        >
          <TrendingUp size={18} /> Refresh insights
        </button>
      </section>
      <Toast
        text="Insights refreshed"
        show={showToast}
        onDismiss={() => setShowToast(false)}
      />
    </>
  );
}
