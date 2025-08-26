import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  numeric,
  integer,
  date,
  time,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const accountTypeEnum = pgEnum('account_type', ['eval', 'pa', 'other']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'disabled']);
export const sideEnum = pgEnum('side', ['long', 'short']);
export const importanceEnum = pgEnum('importance', ['low', 'medium', 'high']);
export const insightTypeEnum = pgEnum('insight_type', ['performance', 'risk', 'pattern', 'suggestion']);

// Trading accounts
export const tradingAccounts = pgTable("trading_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  provider: varchar("provider").notNull().default('tradovate'),
  extAccountId: varchar("ext_account_id"),
  nickname: varchar("nickname"),
  accountType: accountTypeEnum("account_type").default('other'),
  status: accountStatusEnum("status").default('active'),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trades
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tradingAccountId: varchar("trading_account_id").notNull().references(() => tradingAccounts.id),
  symbol: varchar("symbol").notNull(),
  side: sideEnum("side").notNull(),
  qty: numeric("qty").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),
  entryTime: timestamp("entry_time").notNull(),
  exitTime: timestamp("exit_time"),
  fees: numeric("fees").default('0'),
  pnl: numeric("pnl"),
  tags: jsonb("tags").default('[]'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Journal entries
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tradingAccountId: varchar("trading_account_id").references(() => tradingAccounts.id),
  tradeId: varchar("trade_id").references(() => trades.id),
  entryDate: date("entry_date").notNull(),
  title: varchar("title"),
  body: text("body"),
  attachments: jsonb("attachments").default('[]'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily metrics
export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tradingAccountId: varchar("trading_account_id").references(() => tradingAccounts.id),
  tradeDate: date("trade_date").notNull(),
  grossPnl: numeric("gross_pnl").notNull(),
  netPnl: numeric("net_pnl").notNull(),
  winCount: integer("win_count").default(0),
  lossCount: integer("loss_count").default(0),
  maxDrawdown: numeric("max_drawdown"),
  stats: jsonb("stats").default('{}'),
}, (table) => ({
  uniqueUserAccountDate: index("unique_user_account_date").on(table.userId, table.tradingAccountId, table.tradeDate),
}));

// Economic events
export const economicEvents = pgTable("economic_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  time: time("time"),
  timezone: text("timezone").default('America/New_York'),
  country: text("country"),
  importance: importanceEnum("importance").default('low'),
  category: text("category"),
  title: text("title").notNull(),
  source: text("source"),
  sourceEventId: text("source_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI insights
export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: insightTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tradingAccounts: many(tradingAccounts),
  trades: many(trades),
  journalEntries: many(journalEntries),
  dailyMetrics: many(dailyMetrics),
  aiInsights: many(aiInsights),
}));

export const tradingAccountsRelations = relations(tradingAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [tradingAccounts.userId],
    references: [users.id],
  }),
  trades: many(trades),
  journalEntries: many(journalEntries),
  dailyMetrics: many(dailyMetrics),
}));

export const tradesRelations = relations(trades, ({ one, many }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
  tradingAccount: one(tradingAccounts, {
    fields: [trades.tradingAccountId],
    references: [tradingAccounts.id],
  }),
  journalEntries: many(journalEntries),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
  tradingAccount: one(tradingAccounts, {
    fields: [journalEntries.tradingAccountId],
    references: [tradingAccounts.id],
  }),
  trade: one(trades, {
    fields: [journalEntries.tradeId],
    references: [trades.id],
  }),
}));

export const dailyMetricsRelations = relations(dailyMetrics, ({ one }) => ({
  user: one(users, {
    fields: [dailyMetrics.userId],
    references: [users.id],
  }),
  tradingAccount: one(tradingAccounts, {
    fields: [dailyMetrics.tradingAccountId],
    references: [tradingAccounts.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  user: one(users, {
    fields: [aiInsights.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradingAccountSchema = createInsertSchema(tradingAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
});

export const insertDailyMetricsSchema = createInsertSchema(dailyMetrics).omit({
  id: true,
});

export const insertEconomicEventSchema = createInsertSchema(economicEvents).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTradingAccount = z.infer<typeof insertTradingAccountSchema>;
export type TradingAccount = typeof tradingAccounts.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertDailyMetrics = z.infer<typeof insertDailyMetricsSchema>;
export type DailyMetrics = typeof dailyMetrics.$inferSelect;
export type InsertEconomicEvent = z.infer<typeof insertEconomicEventSchema>;
export type EconomicEvent = typeof economicEvents.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;
