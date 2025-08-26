import {
  users,
  tradingAccounts,
  trades,
  journalEntries,
  dailyMetrics,
  economicEvents,
  aiInsights,
  type User,
  type UpsertUser,
  type TradingAccount,
  type InsertTradingAccount,
  type Trade,
  type InsertTrade,
  type JournalEntry,
  type InsertJournalEntry,
  type DailyMetrics,
  type InsertDailyMetrics,
  type EconomicEvent,
  type InsertEconomicEvent,
  type AiInsight,
  type InsertAiInsight,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Trading account operations
  getTradingAccounts(userId: string): Promise<TradingAccount[]>;
  createTradingAccount(account: InsertTradingAccount): Promise<TradingAccount>;
  updateTradingAccount(id: string, updates: Partial<InsertTradingAccount>): Promise<TradingAccount | undefined>;
  
  // Trade operations
  getTrades(userId: string, accountId?: string, from?: string, to?: string, limit?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  getRecentTrades(userId: string, accountId?: string, limit?: number): Promise<Trade[]>;
  
  // Journal operations
  getJournalEntries(userId: string, month: string): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, updates: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  
  // Daily metrics operations
  getDailyMetrics(userId: string, accountId?: string, month?: string): Promise<DailyMetrics[]>;
  upsertDailyMetrics(metrics: InsertDailyMetrics): Promise<DailyMetrics>;
  
  // Economic events operations
  getEconomicEvents(month: string): Promise<EconomicEvent[]>;
  createEconomicEvent(event: InsertEconomicEvent): Promise<EconomicEvent>;
  
  // AI insights operations
  getAiInsights(userId: string, limit?: number): Promise<AiInsight[]>;
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Trading account operations
  async getTradingAccounts(userId: string): Promise<TradingAccount[]> {
    return await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.userId, userId))
      .orderBy(tradingAccounts.createdAt);
  }

  async createTradingAccount(account: InsertTradingAccount): Promise<TradingAccount> {
    const [newAccount] = await db
      .insert(tradingAccounts)
      .values(account)
      .returning();
    return newAccount;
  }

  async updateTradingAccount(id: string, updates: Partial<InsertTradingAccount>): Promise<TradingAccount | undefined> {
    const [updated] = await db
      .update(tradingAccounts)
      .set(updates)
      .where(eq(tradingAccounts.id, id))
      .returning();
    return updated;
  }

  // Trade operations
  async getTrades(userId: string, accountId?: string, from?: string, to?: string, limit = 100): Promise<Trade[]> {
    let conditions = [eq(trades.userId, userId)];

    if (accountId) {
      conditions.push(eq(trades.tradingAccountId, accountId));
    }

    if (from) {
      conditions.push(gte(trades.entryTime, new Date(from)));
    }

    if (to) {
      conditions.push(lte(trades.entryTime, new Date(to)));
    }

    return await db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.entryTime))
      .limit(limit);
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db
      .insert(trades)
      .values(trade)
      .returning();
    return newTrade;
  }

  async getRecentTrades(userId: string, accountId?: string, limit = 5): Promise<Trade[]> {
    let conditions = [eq(trades.userId, userId)];

    if (accountId) {
      conditions.push(eq(trades.tradingAccountId, accountId));
    }

    return await db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.entryTime))
      .limit(limit);
  }

  // Journal operations
  async getJournalEntries(userId: string, month: string): Promise<JournalEntry[]> {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    return await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, userId),
          gte(journalEntries.entryDate, startDate),
          lte(journalEntries.entryDate, endDate)
        )
      )
      .orderBy(journalEntries.entryDate);
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async updateJournalEntry(id: string, updates: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [updated] = await db
      .update(journalEntries)
      .set(updates)
      .where(eq(journalEntries.id, id))
      .returning();
    return updated;
  }

  // Daily metrics operations
  async getDailyMetrics(userId: string, accountId?: string, month?: string): Promise<DailyMetrics[]> {
    let conditions = [eq(dailyMetrics.userId, userId)];

    if (accountId) {
      conditions.push(eq(dailyMetrics.tradingAccountId, accountId));
    }

    if (month) {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      conditions.push(gte(dailyMetrics.tradeDate, startDate));
      conditions.push(lte(dailyMetrics.tradeDate, endDate));
    }

    return await db
      .select()
      .from(dailyMetrics)
      .where(and(...conditions))
      .orderBy(dailyMetrics.tradeDate);
  }

  async upsertDailyMetrics(metrics: InsertDailyMetrics): Promise<DailyMetrics> {
    const [result] = await db
      .insert(dailyMetrics)
      .values(metrics)
      .onConflictDoUpdate({
        target: [dailyMetrics.userId, dailyMetrics.tradingAccountId, dailyMetrics.tradeDate],
        set: metrics,
      })
      .returning();
    return result;
  }

  // Economic events operations
  async getEconomicEvents(month: string): Promise<EconomicEvent[]> {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    
    return await db
      .select()
      .from(economicEvents)
      .where(
        and(
          gte(economicEvents.date, startDate),
          lte(economicEvents.date, endDate)
        )
      )
      .orderBy(economicEvents.date, economicEvents.time);
  }

  async createEconomicEvent(event: InsertEconomicEvent): Promise<EconomicEvent> {
    const [newEvent] = await db
      .insert(economicEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  // AI insights operations
  async getAiInsights(userId: string, limit = 3): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.userId, userId))
      .orderBy(desc(aiInsights.createdAt))
      .limit(limit);
  }

  async createAiInsight(insight: InsertAiInsight): Promise<AiInsight> {
    const [newInsight] = await db
      .insert(aiInsights)
      .values(insight)
      .returning();
    return newInsight;
  }
}

export const storage = new DatabaseStorage();
