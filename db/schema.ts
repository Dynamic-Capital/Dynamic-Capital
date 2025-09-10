import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const botUsers = pgTable("bot_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramId: text("telegram_id").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  notes: text("notes"),
  currentPlanId: uuid("current_plan_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  followUpCount: integer("follow_up_count"),
  lastFollowUp: timestamp("last_follow_up", { withTimezone: true }),
  isVip: boolean("is_vip").notNull().default(false),
  isAdmin: boolean("is_admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BotUser = typeof botUsers.$inferSelect;
export type NewBotUser = typeof botUsers.$inferInsert;
