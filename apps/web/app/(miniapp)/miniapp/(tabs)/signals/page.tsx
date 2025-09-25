"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/miniapp/Skeleton";
import { Toast } from "@/components/miniapp/Toast";
import { haptic, hideMainButton, setMainButton } from "@/lib/telegram";
import { track } from "@/lib/metrics";

const placeholders = new Array(3).fill({
  pair: "--",
  confidence: "--",
  text: "Signal loading...",
});

const signals = [
  {
    pair: "BTC/USDT",
    confidence: "High",
    text: "Breakout above $68.5k. Consider scaling long with tight stop.",
  },
  {
    pair: "ETH/USDT",
    confidence: "Medium",
    text: "Momentum cooling. Watch support at $3.5k before re-entry.",
  },
  {
    pair: "SOL/USDT",
    confidence: "High",
    text: "On-chain flows heating up. Ladder entries between $185-$189.",
  },
];

export default function SignalsTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const refreshTimeoutRef = useRef<number | null>(null);

  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const scheduleLoadingComplete = useCallback(
    (delay: number) => {
      clearRefreshTimeout();
      refreshTimeoutRef.current = window.setTimeout(() => {
        setLoading(false);
        refreshTimeoutRef.current = null;
      }, delay);
    },
    [clearRefreshTimeout],
  );

  useEffect(() => {
    scheduleLoadingComplete(600);
    return () => clearRefreshTimeout();
  }, [clearRefreshTimeout, scheduleLoadingComplete]);

  useEffect(() => {
    setMainButton("Open VIP", () => {
      haptic("medium");
      void track("main_button_open_vip");
      router.push("/miniapp/account");
    });
    return () => hideMainButton();
  }, [router]);

  const data = loading ? placeholders : signals;

  return (
    <>
      <section className="card" style={{ display: "grid", gap: 16 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Signals</h2>
            <p className="muted" style={{ margin: 0 }}>
              Live insights synced from the trading desk.
            </p>
          </div>
          <button
            className="btn"
            style={{
              background: "transparent",
              color: "var(--brand-text)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onClick={() => {
              haptic("light");
              void track("signals_refresh");
              setLoading(true);
              setShowToast(true);
              scheduleLoadingComplete(560);
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          {data.map((signal, index) => (
            <article
              key={`${signal.pair}-${index}`}
              style={{
                padding: "16px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.05)",
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>
                  {loading ? <Skeleton h={16} w={80} /> : signal.pair}
                </strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {loading
                    ? <Skeleton h={12} w={56} />
                    : `Confidence: ${signal.confidence}`}
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--brand-text)" }}>
                {loading ? <Skeleton h={14} w="100%" /> : signal.text}
              </p>
            </article>
          ))}
        </div>

        <button
          className="btn"
          onClick={() => {
            haptic("medium");
            void track("signals_open_vip");
            router.push("/miniapp/account");
          }}
        >
          <ArrowUpRight size={18} />
          Upgrade to VIP
        </button>
      </section>
      <Toast
        text="Signals updated"
        show={showToast}
        onDismiss={() => setShowToast(false)}
      />
    </>
  );
}
