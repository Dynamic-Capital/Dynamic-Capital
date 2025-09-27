import {
  average,
  formatPercentage,
  formatPnL,
  normaliseList,
  toFrequencyMap,
} from "./utils";
import type {
  AggregatedTradeInsight,
  TradeJournalReport,
  TradeJournalRequest,
  TradeRecordInput,
} from "./types";

function normaliseTradeRecord(trade: TradeRecordInput): AggregatedTradeInsight {
  return {
    symbol: trade.symbol.trim(),
    direction: trade.direction.trim(),
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    size: trade.size,
    pnl: trade.pnl,
    rewardRisk: trade.rewardRisk ?? null,
    setup: trade.setup?.trim() ?? null,
    grade: trade.grade?.trim() ?? null,
    notes: trade.notes?.trim() ?? null,
    tags: normaliseList(trade.tags ?? []),
    checklistMisses: normaliseList(trade.checklistMisses ?? []),
  };
}

interface TradeAnalytics {
  trades: AggregatedTradeInsight[];
  wins: AggregatedTradeInsight[];
  losses: AggregatedTradeInsight[];
  flats: AggregatedTradeInsight[];
  totalPnl: number;
  averagePnl: number;
  winRate: number;
  averageRewardRisk: number | null;
  bestTrade: AggregatedTradeInsight | null;
  worstTrade: AggregatedTradeInsight | null;
  tagFrequency: Record<string, number>;
  checklistFrequency: Record<string, number>;
}

function analyseTrades(trades: TradeRecordInput[]): TradeAnalytics {
  const normalised = trades.map(normaliseTradeRecord);

  const wins = normalised.filter((trade) => trade.pnl > 0);
  const losses = normalised.filter((trade) => trade.pnl < 0);
  const flats = normalised.filter((trade) => trade.pnl === 0);
  const totalPnl = normalised.reduce((total, trade) => total + trade.pnl, 0);
  const averagePnl = normalised.length === 0 ? 0 : totalPnl / normalised.length;
  const winRate = normalised.length === 0
    ? 0
    : (wins.length / normalised.length) * 100;
  const rewardRisks = normalised
    .map((trade) => trade.rewardRisk)
    .filter((value): value is number =>
      typeof value === "number" && Number.isFinite(value)
    );
  const averageRewardRisk = average(rewardRisks);

  const bestTrade = normalised.reduce<AggregatedTradeInsight | null>(
    (best, trade) => {
      if (best === null || trade.pnl > best.pnl) {
        return trade;
      }
      return best;
    },
    null,
  );

  const worstTrade = normalised.reduce<AggregatedTradeInsight | null>(
    (worst, trade) => {
      if (worst === null || trade.pnl < worst.pnl) {
        return trade;
      }
      return worst;
    },
    null,
  );

  const tagFrequency = toFrequencyMap(
    normalised.flatMap((trade) => trade.tags),
  );
  const checklistFrequency = toFrequencyMap(
    normalised.flatMap((trade) => trade.checklistMisses),
  );

  return {
    trades: normalised,
    wins,
    losses,
    flats,
    totalPnl,
    averagePnl,
    winRate,
    averageRewardRisk,
    bestTrade,
    worstTrade,
    tagFrequency,
    checklistFrequency,
  };
}

function buildSummary(
  request: TradeJournalRequest,
  analytics: TradeAnalytics,
): string {
  const lines: string[] = [];
  const trimmedSummary = request.sessionSummary.trim();
  if (trimmedSummary) {
    lines.push(trimmedSummary);
  }

  if (analytics.trades.length > 0) {
    const tradeStatement =
      `Logged ${analytics.trades.length} trade${
        analytics.trades.length === 1 ? "" : "s"
      } ` +
      `with ${analytics.wins.length} win${
        analytics.wins.length === 1 ? "" : "s"
      } ` +
      `and ${analytics.losses.length} loss${
        analytics.losses.length === 1 ? "" : "es"
      } ` +
      `(${formatPercentage(analytics.winRate)} win rate) for a net PnL of ${
        formatPnL(analytics.totalPnl)
      }.`;
    lines.push(tradeStatement);
  } else {
    lines.push(
      "No trades were logged in this session. Use the objectives below to prime tomorrow's focus.",
    );
  }

  if (request.riskEvents.length > 0) {
    lines.push(
      `Risk watch: ${request.riskEvents.join(", ")}.`,
    );
  }

  return lines.join(" ");
}

function buildHighlights(
  request: TradeJournalRequest,
  analytics: TradeAnalytics,
): string[] {
  const highlights: string[] = [];

  if (analytics.bestTrade && analytics.bestTrade.pnl > 0) {
    const reward = analytics.bestTrade.rewardRisk;
    const rewardText = typeof reward === "number"
      ? ` (R:R ${reward.toFixed(2)})`
      : "";
    highlights.push(
      `Best trade: ${analytics.bestTrade.symbol} ${analytics.bestTrade.direction} booked ${
        formatPnL(analytics.bestTrade.pnl)
      }${rewardText}.`,
    );
  }

  if (
    typeof analytics.averageRewardRisk === "number" &&
    analytics.averageRewardRisk > 0
  ) {
    highlights.push(
      `Reward-to-risk profile averaged ${
        analytics.averageRewardRisk.toFixed(2)
      } across the session.`,
    );
  }

  if (analytics.wins.length > 0) {
    highlights.push(
      `Win streak: ${analytics.wins.length} winning trade${
        analytics.wins.length === 1 ? "" : "s"
      } supporting the playbook.`,
    );
  }

  const standoutTags = Object.entries(analytics.tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([tag]) => tag);
  if (standoutTags.length > 0) {
    highlights.push(
      `Tag momentum: ${
        standoutTags.join(" & ")
      } remained consistent through execution.`,
    );
  }

  if (highlights.length === 0 && request.objectives.length > 0) {
    highlights.push(
      `Held focus on primary objective: ${request.objectives[0]}.`,
    );
  }

  if (highlights.length === 0) {
    highlights.push(
      "Capture a small win or observation next session to populate highlights.",
    );
  }

  return highlights;
}

function buildLessons(
  analytics: TradeAnalytics,
  request: TradeJournalRequest,
): string[] {
  const lessons: string[] = [];

  analytics.losses.slice(0, 3).forEach((trade) => {
    const note = trade.notes ? ` ${trade.notes}` : "";
    lessons.push(
      `Loss review: ${trade.symbol} ${trade.direction} finished at ${
        formatPnL(trade.pnl)
      }.${note}`,
    );
  });

  Object.entries(analytics.checklistFrequency).forEach(([item]) => {
    lessons.push(`Checklist gap: ${item} resurfaced and needs tightening.`);
  });

  request.riskEvents.forEach((event) => {
    lessons.push(
      `Risk event encountered: ${event}. Document the trigger and remediation.`,
    );
  });

  if (lessons.length === 0) {
    lessons.push(
      "Note the specific behaviours that created smooth execution today.",
    );
  }

  return lessons;
}

function buildNextActions(
  analytics: TradeAnalytics,
  request: TradeJournalRequest,
): string[] {
  const actions: string[] = [];

  analytics.losses.slice(0, 2).forEach((trade) => {
    actions.push(
      `Replay ${trade.symbol} ${trade.direction} to identify one pre-trade adjustment before reattempting it.`,
    );
  });

  Object.entries(analytics.checklistFrequency).forEach(([item]) => {
    actions.push(`Add a drill to rehearse checklist item: ${item}.`);
  });

  request.riskEvents.forEach((event) => {
    actions.push(
      `Design a mitigation plan for risk event "${event}" before the next session.`,
    );
  });

  if (actions.length < 3 && request.objectives.length > 0) {
    actions.push(
      `Plan the first step toward objective "${
        request.objectives[0]
      }" tomorrow.`,
    );
  }

  if (actions.length === 0) {
    actions.push(
      "Capture a quick win task, like tagging screenshots or updating broker notes.",
    );
  }

  return actions.slice(0, 5);
}

function buildMindsetReflections(
  analytics: TradeAnalytics,
  request: TradeJournalRequest,
): string[] {
  const reflections = normaliseList(request.mindsetNotes);

  if (analytics.winRate >= 60 && analytics.wins.length > 0) {
    reflections.push(
      `Confidence anchor: ${analytics.wins.length} clean execution${
        analytics.wins.length === 1 ? "" : "s"
      } delivered a ${
        formatPercentage(analytics.winRate)
      } win rate. Honour the preparation that made them possible.`,
    );
  }

  if (
    analytics.losses.length > analytics.wins.length &&
    analytics.losses.length > 0
  ) {
    const firstLoss = analytics.losses[0];
    reflections.push(
      `Emotional reset: acknowledge any frustration from ${firstLoss.symbol} ${firstLoss.direction} and outline how to re-centre before the open.`,
    );
  }

  if (reflections.length === 0) {
    reflections.push(
      "Log one sentence about energy levels or focus to build the habit.",
    );
  }

  return reflections;
}

function buildCoachPrompts(
  analytics: TradeAnalytics,
  request: TradeJournalRequest,
): string[] {
  const prompts = new Set<string>();

  if (analytics.worstTrade) {
    prompts.add(
      `What specific signal would have kept you out of ${analytics.worstTrade.symbol} ${analytics.worstTrade.direction}?`,
    );
  }

  request.riskEvents.forEach((event) => {
    prompts.add(`How will you de-risk "${event}" before the next session?`);
  });

  if (request.objectives.length > 0) {
    prompts.add(
      `Which behaviour proves progress on "${request.objectives[0]}" tomorrow?`,
    );
  }

  if (
    typeof analytics.averageRewardRisk === "number" &&
    analytics.averageRewardRisk < 1
  ) {
    prompts.add(
      "Where can you improve reward-to-risk without reducing selectivity?",
    );
  }

  if (prompts.size < 3) {
    prompts.add("What felt most controlled today and why?");
  }

  return Array.from(prompts).slice(0, 5);
}

export function generateTradeJournal(
  request: TradeJournalRequest,
): TradeJournalReport {
  const analytics = analyseTrades(request.trades);

  const summary = buildSummary(request, analytics);
  const highlights = buildHighlights(request, analytics);
  const lessons = buildLessons(analytics, request);
  const nextActions = buildNextActions(analytics, request);
  const mindsetReflections = buildMindsetReflections(analytics, request);
  const coachPrompts = buildCoachPrompts(analytics, request);

  return {
    summary,
    performanceHighlights: highlights,
    lessons,
    nextActions,
    mindsetReflections,
    coachPrompts,
    metadata: {
      sessionDate: request.sessionDate,
      objectiveCount: request.objectives.length,
      riskEventCount: request.riskEvents.length,
      tradeCount: analytics.trades.length,
      winningTrades: analytics.wins.length,
      losingTrades: analytics.losses.length,
      flatTrades: analytics.flats.length,
      totalPnl: analytics.totalPnl,
      averagePnl: analytics.averagePnl,
      winRate: analytics.winRate,
      averageRewardRisk: analytics.averageRewardRisk,
      bestTrade: analytics.bestTrade,
      worstTrade: analytics.worstTrade,
      tagFrequency: analytics.tagFrequency,
      checklistMissFrequency: analytics.checklistFrequency,
      metrics: request.metrics,
      environment: request.environment,
    },
    rawResponse: null,
    runs: [],
  };
}
