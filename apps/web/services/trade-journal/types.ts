export interface TradeRecordInput {
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  rewardRisk?: number | null;
  setup?: string | null;
  grade?: string | null;
  notes?: string | null;
  tags?: string[];
  checklistMisses?: string[];
}

export interface TradeJournalRequest {
  sessionDate: string;
  sessionSummary: string;
  objectives: string[];
  marketContext: string;
  trades: TradeRecordInput[];
  riskEvents: string[];
  mindsetNotes: string[];
  metrics: Record<string, unknown>;
  environment: Record<string, unknown>;
}

export interface AggregatedTradeInsight {
  symbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  rewardRisk?: number | null;
  setup?: string | null;
  grade?: string | null;
  notes?: string | null;
  tags: string[];
  checklistMisses: string[];
}

export interface TradeJournalMetadata {
  sessionDate: string;
  objectiveCount: number;
  riskEventCount: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  flatTrades: number;
  totalPnl: number;
  averagePnl: number;
  winRate: number;
  averageRewardRisk: number | null;
  bestTrade: AggregatedTradeInsight | null;
  worstTrade: AggregatedTradeInsight | null;
  tagFrequency: Record<string, number>;
  checklistMissFrequency: Record<string, number>;
  metrics: Record<string, unknown>;
  environment: Record<string, unknown>;
}

export interface TradeJournalReport {
  summary: string;
  performanceHighlights: string[];
  lessons: string[];
  nextActions: string[];
  mindsetReflections: string[];
  coachPrompts: string[];
  metadata: TradeJournalMetadata;
  rawResponse: string | null;
  runs: unknown[];
}
