import type { LiveIntelSnapshot } from "@/data/live-intel";

type LiveIntelPanelProps = {
  snapshot: LiveIntelSnapshot;
  walletVerified: boolean;
  designTokens: Record<string, string>;
  nextUpdateInSeconds: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  error?: string | null;
};

function resolveToken(
  designTokens: Record<string, string>,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = designTokens[key];
    if (value) {
      return value;
    }
  }
  return fallback;
}

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  } catch (error) {
    console.warn("[miniapp] Failed to format live intel timestamp", error);
    return parsed.toISOString();
  }
}

function formatCountdown(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) {
    return null;
  }
  const clamped = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  const minuteLabel = minutes > 0 ? `${minutes}m` : null;
  const secondLabel = `${remainder.toString().padStart(2, "0")}s`;
  return minuteLabel ? `${minuteLabel} ${secondLabel}` : secondLabel;
}

export function LiveIntelPanel({
  snapshot,
  walletVerified,
  designTokens,
  nextUpdateInSeconds,
  refreshing,
  onRefresh,
  error,
}: LiveIntelPanelProps) {
  const accent = resolveToken(
    designTokens,
    ["--once-color-accent", "--once-color-brand", "--accent"],
    "#38bdf8",
  );
  const borderColor = resolveToken(
    designTokens,
    ["--once-border-strong", "--once-border-medium"],
    "rgba(148, 163, 184, 0.25)",
  );
  const surface = resolveToken(
    designTokens,
    ["--once-surface-overlay", "--once-surface-glass", "--surface"],
    "rgba(15, 23, 42, 0.7)",
  );
  const sheen = resolveToken(
    designTokens,
    ["--once-glow-accent", "--once-glow-strong"],
    "rgba(56, 189, 248, 0.2)",
  );

  const formattedTimestamp = formatTimestamp(snapshot.timestamp);
  const confidenceLabel = typeof snapshot.confidence === "number"
    ? `${Math.round(snapshot.confidence * 100)}% confidence`
    : null;
  const countdownLabel = formatCountdown(nextUpdateInSeconds);

  return (
    <aside
      className="flex flex-col gap-6 rounded-3xl border px-6 py-6 text-sm text-white shadow-[0_18px_40px_rgba(15,23,42,0.45)]"
      style={{
        borderColor,
        backgroundImage: `linear-gradient(150deg, ${sheen} 0%, ${surface} 52%, rgba(5,9,18,0.95) 100%)`,
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Live intel snapshot
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-white">
              {snapshot.narrative}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {countdownLabel
              ? (
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80"
                  style={{ borderColor: accent, color: accent }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                  {`Next in ${countdownLabel}`}
                </span>
              )
              : null}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-white transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span
                  className={`h-2 w-2 rounded-full ${refreshing ? "animate-ping" : ""}`}
                  style={{ backgroundColor: accent }}
                />
              </span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold bg-white/10"
              style={{
                borderColor: accent,
                color: accent,
              }}
            >
              {walletVerified ? "Desk linked" : "Preview mode"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
          <span>{formattedTimestamp}</span>
          {confidenceLabel
            ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white/80">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                {confidenceLabel}
              </span>
            )
            : null}
        </div>
        {error
          ? (
            <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
              {error}
            </div>
          )
          : null}
      </div>

      {snapshot.alerts.length > 0
        ? (
          <div className="space-y-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-100">
            <p className="text-sm font-semibold text-rose-100">Alerts</p>
            <ul className="space-y-2">
              {snapshot.alerts.map((alert) => (
                <li key={alert} className="leading-relaxed">
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )
        : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {snapshot.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-white/10 bg-black/30 p-4"
          >
            <p className="text-xs uppercase tracking-wide text-white/50">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {metric.value}
            </p>
            {(metric.change || metric.trend)
              ? (
                <p className="mt-2 text-xs font-medium text-white/60">
                  {metric.trend === "up"
                    ? "▲"
                    : metric.trend === "down"
                    ? "▼"
                    : "◼"}{" "}
                  {metric.change ?? "Stable"}
                </p>
              )
              : null}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
          Timeline
        </h3>
        <ul className="space-y-3">
          {snapshot.timeline.map((entry) => (
            <li
              key={`${entry.title}-${entry.timestamp}`}
              className="rounded-2xl border border-white/10 bg-black/40 p-4"
            >
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-semibold text-white">
                  {entry.title}
                </span>
                <span>{entry.timestamp}</span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-white/50">
                {entry.status}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {entry.description}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Object.values(snapshot.models).map((model) => (
          <div
            key={model.model}
            className="rounded-2xl border border-white/10 bg-black/40 p-4"
          >
            <p className="text-xs uppercase tracking-wide text-white/50">
              {model.model.toUpperCase()} • {model.focus}
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              {model.summary}
            </p>
            <ul className="mt-3 space-y-2 text-xs text-white/60">
              {model.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2">
                  <span className="text-white/40">•</span>
                  <span className="leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
            {typeof model.riskScore === "number"
              ? (
                <p className="mt-3 text-xs font-semibold text-white/70">
                  Risk score: {(model.riskScore * 100).toFixed(0)}%
                </p>
              )
              : null}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <GatedList
            title="Opportunities"
            items={snapshot.opportunities}
            accent={accent}
            walletVerified={walletVerified}
            gated={false}
          />
          <GatedList
            title="Risks"
            items={snapshot.risks}
            accent="#f97316"
            walletVerified={walletVerified}
            gated={false}
          />
        </div>
        <GatedList
          title="Recommended actions"
          items={snapshot.recommendedActions}
          accent={accent}
          walletVerified={walletVerified}
          gated
        />
      </div>
    </aside>
  );
}

type GatedListProps = {
  title: string;
  items: string[];
  accent: string;
  walletVerified: boolean;
  gated: boolean;
};

function GatedList({ title, items, accent, walletVerified, gated }: GatedListProps) {
  const content = (
    <ul className="space-y-2 text-sm text-white/70">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="relative mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/40 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
        {title}
      </h3>
      <div className="mt-3">
        {gated && !walletVerified
          ? (
            <div className="relative">
              <div className="pointer-events-none select-none blur-sm">
                {content}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-xl border border-white/10 bg-black/80 px-4 py-3 text-center text-xs text-white/80">
                  Link your TON wallet to unlock desk-ready actions.
                </div>
              </div>
            </div>
          )
          : content}
      </div>
    </div>
  );
}

export default LiveIntelPanel;
