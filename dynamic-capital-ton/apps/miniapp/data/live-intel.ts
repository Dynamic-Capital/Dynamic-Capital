export type LiveMetric = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "steady";
};

export type LiveTimelineEntry = {
  title: string;
  status: "complete" | "pending" | "upcoming";
  timestamp: string;
  description: string;
};

export type ModelInsight = {
  summary: string;
  highlights: string[];
  focus: string;
  model: "grok-1" | "deepseek-v2";
  riskScore?: number;
};

export type LiveIntelSnapshot = {
  id: string;
  timestamp: string;
  narrative: string;
  confidence?: number;
  alerts: string[];
  opportunities: string[];
  risks: string[];
  recommendedActions: string[];
  metrics: LiveMetric[];
  timeline: LiveTimelineEntry[];
  models: {
    grok: ModelInsight;
    deepseek: ModelInsight;
  };
};

export const DEFAULT_REFRESH_SECONDS = 45;

export const LIVE_INTEL_SNAPSHOTS: LiveIntelSnapshot[] = [
  {
    id: "asia-open",
    timestamp: "2025-03-05T08:00:00Z",
    narrative:
      "Grok-1 spots capital rotating back into TON majors as Asian desks reopen. Funding costs reset lower and momentum screens tilt risk-on.",
    confidence: 0.74,
    alerts: [
      "DeepSeek-V2 Sentinel flags thinner liquidity from 18:00-20:00 UTC as US session winds down.",
    ],
    opportunities: [
      "Scale into TON/USDT ladder while funding spreads remain compressed.",
      "Express upside via delta-neutral vault overlay to capture basis without directional drag.",
      "Shadow the desk's structured product basket; Grok-1 sees 1.2x Sharpe uplift vs. passive staking.",
    ],
    risks: [
      "Overnight rollover may re-introduce 35-40 bps of funding slippage if liquidity stays thin.",
      "Macro: CPI flash due in 14 hours, DeepSeek-V2 recommends keeping risk budgets 15% below ceiling.",
    ],
    recommendedActions: [
      "Allocate 30% of auto-invest buffer to TON/USDT momentum sleeve before European open.",
      "Queue hedges on BTC pairs in case macro data flips broader crypto beta negative.",
      "Stage withdrawals through sequencer by 16:30 UTC to avoid the thin liquidity window.",
    ],
    metrics: [
      {
        label: "Desk yield runway",
        value: "21.4% APY",
        change: "+0.6%",
        trend: "up",
      },
      {
        label: "Live TON signals",
        value: "14 active",
        change: "2 new",
        trend: "steady",
      },
      {
        label: "Settlement latency",
        value: "3m 12s",
        change: "-24s",
        trend: "down",
      },
    ],
    timeline: [
      {
        title: "Desk sync complete",
        status: "complete",
        timestamp: "Live",
        description:
          "Wallet handshake verified. Desk now mirroring Grok-1 allocations in real time.",
      },
      {
        title: "Momentum sleeve deployment",
        status: "pending",
        timestamp: "Next cycle",
        description:
          "Auto-invest queue will deploy into TON/USDT ladder at the 30-minute bar close.",
      },
      {
        title: "Liquidity caution window",
        status: "upcoming",
        timestamp: "18:00 UTC",
        description:
          "DeepSeek-V2 recommends trimming leverage ahead of the thin liquidity band.",
      },
    ],
    models: {
      grok: {
        model: "grok-1",
        focus: "Momentum + vault overlay",
        summary:
          "Signal deck favors high-conviction TON rotations with reduced funding drag. Expects carry premium to persist for 2-3 cycles.",
        highlights: [
          "Momentum breadth +14% versus 7-day average.",
          "Vault overlay adds projected 0.8 Sharpe uplift.",
          "Desk bias: maintain 30% buffer for macro surprises.",
        ],
      },
      deepseek: {
        model: "deepseek-v2",
        focus: "Risk arbitration",
        summary:
          "DeepSeek-V2 Sentinel keeps risk dialled to medium. Recommends staggering entries and keeping hedge inventory warm ahead of CPI.",
        highlights: [
          "Liquidity gap flagged 18:00-20:00 UTC.",
          "Max leverage suggestion: 1.8x core sleeve.",
          "Macro risk budget trimmed by 15% pre-data.",
        ],
        riskScore: 0.42,
      },
    },
  },
  {
    id: "eu-session",
    timestamp: "2025-03-05T12:30:00Z",
    narrative:
      "Grok-1 reads a rotation into cross-chain yield as European desks chase basis. DeepSeek-V2 softens risk posture but keeps drawdown guardrails engaged.",
    confidence: 0.68,
    alerts: [
      "Cross-chain bridge latency elevated by 11%. Monitor TON ↔ ETH lanes before sizing into new vaults.",
    ],
    opportunities: [
      "Deploy idle USDT into the dynamic vault ladder capturing 180-220 bps of excess yield.",
      "Mirror desk OTC block to access discounted TON borrow for structured carry.",
      "Redirect mentorship cohort to follow Grok-1's live workshop at 15:00 UTC covering the rotation.",
    ],
    risks: [
      "Bridge congestion can delay large ticket withdrawals by up to 6 minutes.",
      "DeepSeek-V2 notes elevated counterparty variance on two OTC venues—route via desk rails only.",
      "Macro: US data heavy session later; keep optionality for fast hedging.",
    ],
    recommendedActions: [
      "Top up the cross-chain vault sleeve before latency decays the basis opportunity.",
      "Keep 10% of capital liquid to pivot into post-data reversals.",
      "Join the live workshop to align mentorship cohort execution with desk timing.",
    ],
    metrics: [
      {
        label: "Vault coverage",
        value: "92% allocated",
        change: "+5%",
        trend: "up",
      },
      {
        label: "Bridge latency",
        value: "5m 48s",
        change: "+38s",
        trend: "up",
      },
      {
        label: "Active cohorts",
        value: "6 live rooms",
        change: "Mentorship now",
        trend: "steady",
      },
    ],
    timeline: [
      {
        title: "Cross-chain vault top-up",
        status: "complete",
        timestamp: "12:20",
        description:
          "Desk executed vault rebalance; Grok-1 confirmatory ping received.",
      },
      {
        title: "Mentorship workshop",
        status: "pending",
        timestamp: "15:00 UTC",
        description:
          "Live playbook review walking through the rotation with cohort leaders.",
      },
      {
        title: "Data risk window",
        status: "upcoming",
        timestamp: "18:00 UTC",
        description:
          "DeepSeek-V2 to re-run stress test immediately after macro print.",
      },
    ],
    models: {
      grok: {
        model: "grok-1",
        focus: "Cross-chain carry",
        summary:
          "Strategy leans into vault carry where basis remains fat. Suggests recycling profits into mentorship-led live trades for cohesion.",
        highlights: [
          "Carry spread +210 bps vs. baseline.",
          "OTC desk offers 0.9% borrow discount if filled before US open.",
          "Mentorship sync ensures consistent execution cadence.",
        ],
      },
      deepseek: {
        model: "deepseek-v2",
        focus: "Counterparty & latency",
        summary:
          "DeepSeek-V2 keeps a cautious tone: emphasises routing through trusted rails and staging exits across multiple bridges.",
        highlights: [
          "Latency up 11% on TON ↔ ETH lanes.",
          "Counterparty variance 1.4σ above mean on two OTC books.",
          "Suggest staging withdrawal tickets to avoid congestion.",
        ],
        riskScore: 0.56,
      },
    },
  },
  {
    id: "us-close",
    timestamp: "2025-03-05T21:00:00Z",
    narrative:
      "Desk winds down US session exposure. Grok-1 favours locking gains while DeepSeek-V2 watches liquidity cliffs around the close.",
    confidence: 0.62,
    alerts: [
      "DeepSeek-V2 flags widening spreads on TON/ETH during the close—expect up to 45 bps slippage if trading size.",
      "Monitor sequencer backlog; withdrawals above 50k TON should be pre-scheduled.",
    ],
    opportunities: [
      "Rotate excess yield into short-dated vault to hold gains overnight.",
      "Mirror desk protective put overlay to guard against post-close gap risk.",
      "Queue tomorrow's Asia session entries now while Grok-1 precomputes scenarios.",
    ],
    risks: [
      "Slippage widens sharply on large TON/ETH blocks after 21:15 UTC.",
      "Sequencer backlog risk as VIP cohort batches exit instructions.",
      "Macro fatigue—VIX futures pricing in 1.3x normal overnight move.",
    ],
    recommendedActions: [
      "Lock current cycle gains via the overnight vault sleeve.",
      "Hold protective options overlay through the macro data window.",
      "Ping concierge if planning withdrawals above 50k TON to pre-clear lanes.",
    ],
    metrics: [
      {
        label: "Cycle PnL locked",
        value: "+4.6%",
        change: "Settled",
        trend: "steady",
      },
      {
        label: "Sequencer load",
        value: "63%",
        change: "+12%",
        trend: "up",
      },
      {
        label: "Overnight risk budget",
        value: "1.1x",
        change: "Within guardrails",
        trend: "steady",
      },
    ],
    timeline: [
      {
        title: "Cycle wrap",
        status: "complete",
        timestamp: "20:45",
        description:
          "Desk captured profits and redistributed into the overnight vault.",
      },
      {
        title: "Protective overlay",
        status: "pending",
        timestamp: "21:10 UTC",
        description: "DeepSeek-V2 verifying hedge coverage before the close.",
      },
      {
        title: "Asia prep",
        status: "upcoming",
        timestamp: "23:30 UTC",
        description:
          "Grok-1 running new playbooks for tomorrow's Asia session entries.",
      },
    ],
    models: {
      grok: {
        model: "grok-1",
        focus: "Cycle reset",
        summary:
          "Prioritise locking in gains and staging Asia session plans. Keep optionality to re-enter if volatility fades overnight.",
        highlights: [
          "PnL locked at +4.6% for the cycle.",
          "Asia prep scenarios seeded across three volatility regimes.",
          "Desk bias: run lighter through macro window, add risk after recalibration.",
        ],
      },
      deepseek: {
        model: "deepseek-v2",
        focus: "Liquidity & execution",
        summary:
          "DeepSeek-V2 emphasises execution discipline—avoid chasing late prints and stagger exits to sidestep sequencer queues.",
        highlights: [
          "Spreads on TON/ETH widening post 21:15 UTC.",
          "Sequencer load trending 12% above baseline.",
          "Maintain overnight risk budget at 1.1x until macro clears.",
        ],
        riskScore: 0.61,
      },
    },
  },
];

export function resolveSnapshotIndex(index: number, total: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }
  if (total <= 0) {
    return 0;
  }
  const mod = index % total;
  return mod < 0 ? mod + total : mod;
}

export function snapshotForTimestamp(date: Date): LiveIntelSnapshot {
  const total = LIVE_INTEL_SNAPSHOTS.length;
  const cycle = Math.floor(date.getTime() / (DEFAULT_REFRESH_SECONDS * 1000));
  const index = resolveSnapshotIndex(cycle, total);
  return LIVE_INTEL_SNAPSHOTS[index];
}
