import { z } from "zod";

import type { TradeJournalRequest, TradeRecordInput } from "./types";
import { tradeJournalRequestDefaults } from "./utils";

const nonEmptyString = z.string().trim().min(1);

export const tradeRecordSchema = z.object({
  symbol: nonEmptyString,
  direction: nonEmptyString,
  entryPrice: z.number().finite(),
  exitPrice: z.number().finite(),
  size: z.number().finite(),
  pnl: z.number().finite(),
  rewardRisk: z.number().finite().optional().nullable(),
  setup: z.string().trim().optional().nullable(),
  grade: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  tags: z.array(nonEmptyString).max(12).default([]),
  checklistMisses: z.array(nonEmptyString).max(12).default([]),
});

const baseTradeJournalRequestSchema = z.object({
  sessionDate: nonEmptyString,
  sessionSummary: nonEmptyString,
  objectives: z.array(nonEmptyString).max(12).default([]),
  marketContext: z.string().trim().default(""),
  trades: z.array(tradeRecordSchema).max(60).default([]),
  riskEvents: z.array(nonEmptyString).max(12).default([]),
  mindsetNotes: z.array(nonEmptyString).max(12).default([]),
  metrics: z.record(z.unknown()).default({}),
  environment: z.record(z.unknown()).default({}),
});

export const tradeJournalRequestSchema = baseTradeJournalRequestSchema
  .transform((value) => {
    const trades = (value.trades ?? []).map((trade): TradeRecordInput => {
      const parsed = tradeRecordSchema.parse(trade);

      return {
        symbol: parsed.symbol,
        direction: parsed.direction,
        entryPrice: parsed.entryPrice,
        exitPrice: parsed.exitPrice,
        size: parsed.size,
        pnl: parsed.pnl,
        rewardRisk: parsed.rewardRisk ?? undefined,
        setup: parsed.setup ?? undefined,
        grade: parsed.grade ?? undefined,
        notes: parsed.notes ?? undefined,
        tags: parsed.tags ?? [],
        checklistMisses: parsed.checklistMisses ?? [],
      };
    });

    const request: TradeJournalRequest = {
      ...tradeJournalRequestDefaults,
      ...value,
      trades,
    };

    return request;
  });

export type TradeRecordInputSchema = z.infer<typeof tradeRecordSchema>;
export type TradeJournalRequestSchema = z.infer<
  typeof tradeJournalRequestSchema
>;
