export type OfflineSignalOutcome = "win" | "loss" | "breakeven";

export interface OfflineSignalSample {
  id: string;
  daysAgo: number;
  status: "executed" | "cancelled" | "pending";
  result: OfflineSignalOutcome;
  returnPct: number;
  holdingHours: number;
}

export interface OfflineMentorFeedbackSample {
  id: string;
  score: number;
  daysAgo: number;
}

export interface OfflineMetricsDataset {
  datasetLabel: string;
  tradersOnboardedTotal: number;
  totalMentorFeedbackCount: number;
  signals: OfflineSignalSample[];
  mentorFeedback: OfflineMentorFeedbackSample[];
}

export const OFFLINE_DATASET: OfflineMetricsDataset = {
  datasetLabel: "offline-sample",
  tradersOnboardedTotal: 9600,
  totalMentorFeedbackCount: 6,
  signals: [
    {
      id: "sig-001",
      daysAgo: 2,
      status: "executed",
      result: "win",
      returnPct: 1.8,
      holdingHours: 6,
    },
    {
      id: "sig-002",
      daysAgo: 4,
      status: "executed",
      result: "loss",
      returnPct: -0.6,
      holdingHours: 8,
    },
    {
      id: "sig-003",
      daysAgo: 6,
      status: "executed",
      result: "win",
      returnPct: 1.1,
      holdingHours: 5,
    },
    {
      id: "sig-004",
      daysAgo: 9,
      status: "executed",
      result: "win",
      returnPct: 2.4,
      holdingHours: 12,
    },
    {
      id: "sig-005",
      daysAgo: 12,
      status: "executed",
      result: "win",
      returnPct: 0.9,
      holdingHours: 4,
    },
    {
      id: "sig-006",
      daysAgo: 14,
      status: "executed",
      result: "loss",
      returnPct: -0.7,
      holdingHours: 7,
    },
    {
      id: "sig-007",
      daysAgo: 16,
      status: "executed",
      result: "win",
      returnPct: 1.5,
      holdingHours: 10,
    },
    {
      id: "sig-008",
      daysAgo: 18,
      status: "executed",
      result: "breakeven",
      returnPct: 0,
      holdingHours: 3,
    },
    {
      id: "sig-009",
      daysAgo: 22,
      status: "executed",
      result: "win",
      returnPct: 1.2,
      holdingHours: 9,
    },
    {
      id: "sig-010",
      daysAgo: 24,
      status: "executed",
      result: "loss",
      returnPct: -0.4,
      holdingHours: 6,
    },
    {
      id: "sig-011",
      daysAgo: 27,
      status: "executed",
      result: "win",
      returnPct: 1.7,
      holdingHours: 5,
    },
    {
      id: "sig-012",
      daysAgo: 33,
      status: "executed",
      result: "breakeven",
      returnPct: 0,
      holdingHours: 4,
    },
    {
      id: "sig-013",
      daysAgo: 38,
      status: "executed",
      result: "loss",
      returnPct: -0.9,
      holdingHours: 8,
    },
    {
      id: "sig-014",
      daysAgo: 42,
      status: "executed",
      result: "win",
      returnPct: 1,
      holdingHours: 6,
    },
    {
      id: "sig-015",
      daysAgo: 55,
      status: "executed",
      result: "win",
      returnPct: 1.3,
      holdingHours: 7,
    },
    {
      id: "sig-016",
      daysAgo: 72,
      status: "executed",
      result: "loss",
      returnPct: -1.1,
      holdingHours: 5,
    },
    {
      id: "sig-017",
      daysAgo: 95,
      status: "executed",
      result: "win",
      returnPct: 0.8,
      holdingHours: 4,
    },
    {
      id: "sig-018",
      daysAgo: 5,
      status: "cancelled",
      result: "loss",
      returnPct: -1,
      holdingHours: 0,
    },
  ],
  mentorFeedback: [
    { id: "mentor-001", score: 4.8, daysAgo: 5 },
    { id: "mentor-002", score: 4.9, daysAgo: 12 },
    { id: "mentor-003", score: 4.7, daysAgo: 21 },
    { id: "mentor-004", score: 4.6, daysAgo: 47 },
    { id: "mentor-005", score: 4.8, daysAgo: 78 },
    { id: "mentor-006", score: 4.5, daysAgo: 110 },
  ],
};
