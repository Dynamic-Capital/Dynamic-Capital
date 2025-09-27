import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const botUsers = pgTable("bot_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramId: text("telegram_id").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  notes: text("notes"),
  currentPlanId: uuid("current_plan_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", {
    withTimezone: true,
  }),
  followUpCount: integer("follow_up_count"),
  lastFollowUp: timestamp("last_follow_up", { withTimezone: true }),
  isVip: boolean("is_vip").notNull().default(false),
  isAdmin: boolean("is_admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type BotUser = typeof botUsers.$inferSelect;
export type NewBotUser = typeof botUsers.$inferInsert;

export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull()
    .default({} as Record<string, unknown>),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;

export const plugins = pgTable("plugins", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  type: text("type").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull()
    .default({} as Record<string, unknown>),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type Plugin = typeof plugins.$inferSelect;
export type NewPlugin = typeof plugins.$inferInsert;

export const paymentGatewayEvents = pgTable("payment_gateway_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  gateway: text("gateway").notNull(),
  reference: text("reference"),
  status: text("status").notNull().default("received"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  headers: jsonb("headers").$type<Record<string, unknown>>().notNull().default(
    {} as Record<string, unknown>,
  ),
  signature: text("signature"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type PaymentGatewayEvent = typeof paymentGatewayEvents.$inferSelect;
export type NewPaymentGatewayEvent = typeof paymentGatewayEvents.$inferInsert;

export const marketNews = pgTable("market_news", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  source: text("source"),
  headline: text("headline"),
  eventTime: timestamp("event_time", { withTimezone: true }),
  impact: text("impact"),
  currency: text("currency"),
  forecast: text("forecast"),
  actual: text("actual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type MarketNews = typeof marketNews.$inferSelect;
export type NewMarketNews = typeof marketNews.$inferInsert;

export const sentiment = pgTable("sentiment", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  source: text("source"),
  symbol: text("symbol"),
  sentiment: numeric("sentiment", { precision: 10, scale: 4, mode: "number" }),
  longPercent: numeric("long_percent", {
    precision: 10,
    scale: 4,
    mode: "number",
  }),
  shortPercent: numeric("short_percent", {
    precision: 10,
    scale: 4,
    mode: "number",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type Sentiment = typeof sentiment.$inferSelect;
export type NewSentiment = typeof sentiment.$inferInsert;

export const cotReports = pgTable("cot_reports", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  market: text("market"),
  commercialLong: bigint("commercial_long", { mode: "number" }),
  commercialShort: bigint("commercial_short", { mode: "number" }),
  noncommercialLong: bigint("noncommercial_long", { mode: "number" }),
  noncommercialShort: bigint("noncommercial_short", { mode: "number" }),
  date: date("date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type CotReport = typeof cotReports.$inferSelect;
export type NewCotReport = typeof cotReports.$inferInsert;

export const marketMovers = pgTable("market_movers", {
  symbol: text("symbol").primaryKey(),
  display: text("display").notNull(),
  score: numeric("score", { precision: 8, scale: 4, mode: "number" })
    .notNull(),
  classification: text("classification").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type MarketMover = typeof marketMovers.$inferSelect;
export type NewMarketMover = typeof marketMovers.$inferInsert;

export const mentorFeedback = pgTable("mentor_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  mentorId: uuid("mentor_id"),
  menteeTelegramId: text("mentee_telegram_id"),
  score: numeric("score", { precision: 2, scale: 1, mode: "number" })
    .notNull(),
  notes: text("notes"),
  source: text("source"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type MentorFeedback = typeof mentorFeedback.$inferSelect;
export type NewMentorFeedback = typeof mentorFeedback.$inferInsert;

export const economicCatalysts = pgTable("economic_catalysts", {
  pair: text("pair").primaryKey(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  headline: text("headline").notNull(),
  impact: text("impact").notNull(),
  marketFocus: jsonb("market_focus").$type<string[]>().notNull()
    .default([] as string[]),
  commentary: text("commentary"),
  metrics: jsonb("metrics").$type<Record<string, number>>().notNull()
    .default({} as Record<string, number>),
  source: text("source").notNull().default("awesomeapi"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type EconomicCatalystRow = typeof economicCatalysts.$inferSelect;
export type NewEconomicCatalystRow = typeof economicCatalysts.$inferInsert;

type FundamentalMetric = {
  label: string;
  value: string;
};

export const fundamentalPositioning = pgTable("fundamental_positioning", {
  id: uuid("id").primaryKey().defaultRandom(),
  asset: text("asset").notNull().unique(),
  sector: text("sector").notNull(),
  positioning: text("positioning").notNull(),
  summary: text("summary").notNull(),
  catalysts: jsonb("catalysts").$type<string[]>().notNull()
    .default([] as string[]),
  riskControls: text("risk_controls").notNull(),
  metrics: jsonb("metrics").$type<FundamentalMetric[]>().notNull()
    .default([] as FundamentalMetric[]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
});

export type FundamentalPositioning = typeof fundamentalPositioning.$inferSelect;
export type NewFundamentalPositioning =
  typeof fundamentalPositioning.$inferInsert;

export const onchainBalances = pgTable("onchain_balances", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  chainId: text("chain_id").notNull(),
  address: text("address").notNull(),
  tokenAddress: text("token_address"),
  tokenSymbol: text("token_symbol").notNull(),
  tokenDecimals: integer("token_decimals").notNull().default(0),
  balance: numeric("balance", { precision: 30, scale: 12, mode: "string" })
    .notNull(),
  usdValue: numeric("usd_value", { precision: 30, scale: 12, mode: "number" }),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull()
    .defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull()
    .default({} as Record<string, unknown>),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  chainIdx: index("onchain_balances_chain_idx").on(table.chainId),
  addressIdx: index("onchain_balances_address_idx").on(table.address),
  uniqueSnapshot: uniqueIndex("onchain_balances_unique").on(
    table.chainId,
    table.address,
    table.tokenAddress,
    table.observedAt,
  ),
}));

export type OnchainBalanceRow = typeof onchainBalances.$inferSelect;
export type NewOnchainBalanceRow = typeof onchainBalances.$inferInsert;

export const onchainActivity = pgTable("onchain_activity", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  chainId: text("chain_id").notNull(),
  address: text("address").notNull(),
  txHash: text("tx_hash").notNull(),
  direction: text("direction").notNull(),
  counterparty: text("counterparty"),
  tokenSymbol: text("token_symbol"),
  amount: numeric("amount", { precision: 30, scale: 12, mode: "string" })
    .notNull(),
  status: text("status").notNull().default("confirmed"),
  blockNumber: text("block_number"),
  blockTimestamp: timestamp("block_timestamp", { withTimezone: true }),
  fee: numeric("fee", { precision: 30, scale: 12, mode: "string" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull()
    .default({} as Record<string, unknown>),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  txIdx: uniqueIndex("onchain_activity_unique").on(
    table.chainId,
    table.txHash,
    table.address,
  ),
  chainIdx: index("onchain_activity_chain_idx").on(table.chainId),
}));

export type OnchainActivityRow = typeof onchainActivity.$inferSelect;
export type NewOnchainActivityRow = typeof onchainActivity.$inferInsert;

export const onchainMetrics = pgTable("onchain_metrics", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  provider: text("provider").notNull(),
  metric: text("metric").notNull(),
  value: numeric("value", { precision: 30, scale: 12, mode: "number" })
    .notNull(),
  unit: text("unit"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull()
    .defaultNow(),
  tags: jsonb("tags").$type<Record<string, string>>().notNull()
    .default({} as Record<string, string>),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull()
    .default({} as Record<string, unknown>),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
    .defaultNow(),
}, (table) => ({
  metricIdx: uniqueIndex("onchain_metrics_unique").on(
    table.provider,
    table.metric,
    table.observedAt,
  ),
}));

export type OnchainMetricRow = typeof onchainMetrics.$inferSelect;
export type NewOnchainMetricRow = typeof onchainMetrics.$inferInsert;
