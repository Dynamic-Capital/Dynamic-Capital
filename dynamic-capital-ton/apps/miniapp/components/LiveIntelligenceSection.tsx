"use client";

import type { LiveIntelSnapshot } from "../data/live-intel";
import { formatRelativeTime } from "../lib/time";
import type { LiveIntelState } from "../hooks/useLiveIntel";

function formatConfidence(value?: number): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const bounded = Math.min(Math.max(value, 0), 1);
  return `${Math.round(bounded * 100)}% confidence`;
}

function riskSeverity(score?: number): "low" | "medium" | "high" {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "low";
  }
  if (score < 0.34) {
    return "low";
  }
  if (score < 0.67) {
    return "medium";
  }
  return "high";
}

type LiveIntelligenceSectionProps = {
  intel?: LiveIntelSnapshot;
  status: LiveIntelState["status"];
  isSyncing: boolean;
  updatedAt?: string;
  countdown: number | null;
  error?: string;
  onRefresh: () => void;
};

export function LiveIntelligenceSection({
  intel,
  status,
  isSyncing,
  updatedAt,
  countdown,
  error,
  onRefresh,
}: LiveIntelligenceSectionProps) {
  const confidenceLabel = formatConfidence(intel?.confidence);
  const alerts = intel?.alerts ?? [];
  const opportunities = intel?.opportunities ?? [];
  const risks = intel?.risks ?? [];
  const hasIntel = Boolean(intel);

  return (
    <section className="section-card" id="intel">
      <div className="section-header">
        <div>
          <h2 className="section-title">Live desk intelligence</h2>
          <p className="section-description">
            Grok-1 strategy briefs are auto-synced with DeepSeek-V2 risk
            arbitration so every decision stays in lockstep with the desk.
          </p>
        </div>
        <div className="selected-plan-pill">
          {isSyncing
            ? "Syncing…"
            : countdown !== null
            ? `Next sync in ${countdown}s`
            : updatedAt
            ? `Updated ${formatRelativeTime(updatedAt)}`
            : "Awaiting sync"}
        </div>
      </div>

      {error && status === "error" && (
        <div className="status-banner status-banner--error">
          Unable to reach the intelligence feed right now. We'll retry
          automatically.
          <button
            type="button"
            className="button button-ghost"
            onClick={onRefresh}
          >
            Retry now
          </button>
        </div>
      )}

      <div className="intel-grid">
        <div className="intel-card intel-card--primary">
          <div className="intel-meta">
            <span className="intel-updated">
              {isSyncing
                ? "Streaming Grok-1 update…"
                : updatedAt
                ? `Last sync ${formatRelativeTime(updatedAt)}`
                : "Waiting for first sync"}
            </span>
            {confidenceLabel && (
              <span className="confidence-chip">{confidenceLabel}</span>
            )}
          </div>
          {hasIntel
            ? (
              <>
                <p className="intel-narrative">{intel?.narrative}</p>
                {alerts.length > 0
                  ? (
                    <ul className="alert-list">
                      {alerts.map((alert) => (
                        <li key={alert} className="alert-pill">
                          <span aria-hidden>⚠️</span>
                          {alert}
                        </li>
                      ))}
                    </ul>
                  )
                  : (
                    <p className="intel-muted">
                      No blocking alerts flagged by DeepSeek-V2 sentinel.
                    </p>
                  )}
              </>
            )
            : (
              <div className="skeleton-group">
                <div className="skeleton skeleton--text skeleton--wide" />
                <div className="skeleton skeleton--text skeleton--wide" />
                <div className="skeleton skeleton--text skeleton--medium" />
              </div>
            )}
        </div>

        <div className="intel-card">
          <h3>Opportunities</h3>
          {hasIntel
            ? (
              <ul className="intel-list">
                {opportunities.map((item) => (
                  <li key={item}>
                    <span
                      className="intel-bullet intel-bullet--opportunity"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )
            : <IntelListSkeleton />}
        </div>

        <div className="intel-card">
          <h3>Risks</h3>
          {hasIntel
            ? (
              <ul className="intel-list">
                {risks.map((item) => (
                  <li key={item}>
                    <span
                      className="intel-bullet intel-bullet--risk"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )
            : <IntelListSkeleton />}
        </div>
      </div>

      {intel ? <ModelBreakdown intel={intel} /> : (
        <div className="model-grid">
          <div className="model-card">
            <div className="skeleton skeleton--text skeleton--medium" />
            <div className="skeleton skeleton--block" />
            <div className="skeleton skeleton--text skeleton--medium" />
          </div>
          <div className="model-card">
            <div className="skeleton skeleton--text skeleton--medium" />
            <div className="skeleton skeleton--block" />
            <div className="skeleton skeleton--text skeleton--medium" />
          </div>
        </div>
      )}

      {error && status !== "error" && (
        <div className="status-banner status-banner--error">
          Brief network hiccup detected. Showing the last Grok-1 + DeepSeek-V2
          sync while we refresh in the background.
        </div>
      )}
    </section>
  );
}

function IntelListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-group">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`intel-skeleton-${index}`}
          className="skeleton skeleton--text skeleton--wide"
        />
      ))}
    </div>
  );
}

function ModelBreakdown({ intel }: { intel: LiveIntelSnapshot }) {
  const grok = intel.models.grok;
  const deepseek = intel.models.deepseek;
  const riskScore = typeof deepseek.riskScore === "number"
    ? Math.min(Math.max(deepseek.riskScore, 0), 1)
    : null;
  const riskLevel = riskSeverity(riskScore ?? undefined);
  const riskLabel = riskScore === null
    ? "Risk scan"
    : `${Math.round(riskScore * 100)}% risk`;

  return (
    <div className="model-grid">
      <div className="model-card">
        <div className="model-header">
          <span className="model-name">Grok-1 strategist</span>
          <span className="model-tag">{grok.focus}</span>
        </div>
        <p className="model-summary">{grok.summary}</p>
        <ul className="model-highlights">
          {grok.highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div className="model-card">
        <div className="model-header">
          <span className="model-name">DeepSeek-V2 sentinel</span>
          <span className={`model-risk model-risk--${riskLevel}`}>
            {riskLabel}
          </span>
        </div>
        <p className="model-summary">{deepseek.summary}</p>
        <ul className="model-highlights">
          {deepseek.highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}
