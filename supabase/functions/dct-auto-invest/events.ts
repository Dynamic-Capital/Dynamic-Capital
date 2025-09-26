import { enqueue } from "../../../queue/index.ts";

export interface EventSplitConfig {
  operationsPct: number;
  autoInvestPct: number;
  buybackBurnPct: number;
}

export interface SwapSnapshot {
  dctAmount: number;
  swapTxHash: string;
  routerSwapId: string;
  priceSnapshotId: string | null;
  oraclePrice: number | null;
  usdNotional: number;
}

export interface PaymentRecordedEvent {
  subscriptionId: string;
  userId: string;
  plan: string;
  tonTxHash: string;
  tonAmount: number;
  operationsTon: number;
  autoInvestTon: number;
  burnTon: number;
  walletAddress: string;
  paymentId: string | null;
  initData: string | null;
  splits: EventSplitConfig;
  autoInvestSwap: SwapSnapshot;
  burnSwap: SwapSnapshot;
  burnTxHash: string | null;
  metadata: Record<string, unknown> | null;
  stakeId: string | null;
  recordedAt: string;
}

export interface BurnExecutedEvent {
  subscriptionId: string;
  userId: string;
  plan: string;
  tonTxHash: string;
  burnTon: number;
  dctAmount: number;
  burnTxHash: string | null;
  routerSwapId: string | null;
  paymentId: string | null;
  recordedAt: string;
}

const MAX_EVENT_ATTEMPTS = 8;

export async function publishPaymentRecordedEvent(
  payload: PaymentRecordedEvent,
) {
  await enqueue("payment.recorded", payload, {
    maxAttempts: MAX_EVENT_ATTEMPTS,
    backoff: "exp",
  });
}

export async function publishBurnExecutedEvent(payload: BurnExecutedEvent) {
  await enqueue("burn.executed", payload, {
    maxAttempts: MAX_EVENT_ATTEMPTS,
    backoff: "exp",
  });
}
