import {
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
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
