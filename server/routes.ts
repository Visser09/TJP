import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertTradingAccountSchema,
  insertTradeSchema,
  insertJournalEntrySchema,
  insertDailyMetricsSchema,
  insertEconomicEventSchema,
  insertAiInsightSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Trading accounts
  app.get('/api/trading-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const accounts = await storage.getTradingAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching trading accounts:", error);
      res.status(500).json({ message: "Failed to fetch trading accounts" });
    }
  });

  app.post('/api/trading-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const accountData = insertTradingAccountSchema.parse({
        ...req.body,
        userId,
      });
      const account = await storage.createTradingAccount(accountData);
      res.json(account);
    } catch (error) {
      console.error("Error creating trading account:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid account data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create trading account" });
      }
    }
  });

  // Trades
  app.get('/api/trades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, from, to, limit } = req.query;
      const trades = await storage.getTrades(
        userId,
        accountId as string,
        from as string,
        to as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(trades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post('/api/trades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const tradeData = insertTradeSchema.parse({
        ...req.body,
        userId,
      });
      const trade = await storage.createTrade(tradeData);
      res.json(trade);
    } catch (error) {
      console.error("Error creating trade:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid trade data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create trade" });
      }
    }
  });

  app.get('/api/trades/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, limit } = req.query;
      const trades = await storage.getRecentTrades(
        userId,
        accountId as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(trades);
    } catch (error) {
      console.error("Error fetching recent trades:", error);
      res.status(500).json({ message: "Failed to fetch recent trades" });
    }
  });

  // Analytics
  app.get('/api/analytics/daily', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, month } = req.query;
      
      const metrics = await storage.getDailyMetrics(
        userId,
        accountId as string,
        month as string
      );
      
      const journalEntries = await storage.getJournalEntries(userId, month as string);
      const economicEvents = await storage.getEconomicEvents(month as string);
      
      // Transform data for calendar view
      const days = metrics.map(metric => ({
        date: metric.tradeDate,
        trades: (metric.winCount || 0) + (metric.lossCount || 0),
        pnl: parseFloat(metric.netPnl || '0'),
        hasJournal: journalEntries.some(entry => entry.entryDate === metric.tradeDate),
        isOpenMarket: isMarketOpen(metric.tradeDate),
        events: economicEvents.filter(event => event.date === metric.tradeDate)
      }));
      
      res.json({ days });
    } catch (error) {
      console.error("Error fetching daily analytics:", error);
      res.status(500).json({ message: "Failed to fetch daily analytics" });
    }
  });

  app.get('/api/analytics/performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, range } = req.query;
      
      // Get recent trades for performance calculation
      const trades = await storage.getRecentTrades(userId, accountId as string, 100);
      
      const totalPnl = trades.reduce((sum, trade) => sum + parseFloat(trade.pnl || '0'), 0);
      const winningTrades = trades.filter(trade => parseFloat(trade.pnl || '0') > 0);
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
      
      const performanceData = {
        totalPnl,
        winRate,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: trades.length - winningTrades.length,
      };
      
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch performance analytics" });
    }
  });

  // Journal
  app.get('/api/journal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { month } = req.query;
      const entries = await storage.getJournalEntries(userId, month as string);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post('/api/journal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const entryData = insertJournalEntrySchema.parse({
        ...req.body,
        userId,
      });
      const entry = await storage.createJournalEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid journal entry data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create journal entry" });
      }
    }
  });

  // Economic events
  app.get('/api/econ', async (req, res) => {
    try {
      const { month } = req.query;
      const events = await storage.getEconomicEvents(month as string);
      res.json(events);
    } catch (error) {
      console.error("Error fetching economic events:", error);
      res.status(500).json({ message: "Failed to fetch economic events" });
    }
  });

  // AI insights
  app.get('/api/ai-insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { limit } = req.query;
      const insights = await storage.getAiInsights(
        userId,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(insights);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ message: "Failed to fetch AI insights" });
    }
  });

  app.post('/api/ai-insights/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      
      // Generate sample insights based on user data
      const trades = await storage.getRecentTrades(userId, undefined, 100);
      const insights = await generateInsights(userId, trades);
      
      // Save insights to database
      for (const insight of insights) {
        await storage.createAiInsight({
          userId,
          type: insight.type,
          title: insight.title,
          content: insight.content,
        });
      }
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  app.post('/api/ai-insights/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { message } = req.body;
      
      // This would integrate with an AI service
      const response = await processAiChat(userId, message);
      
      res.json({ response });
    } catch (error) {
      console.error("Error processing AI chat:", error);
      res.status(500).json({ message: "Failed to process AI chat" });
    }
  });

  // Tradovate integration (stub endpoints)
  app.post('/api/tradovate/connect', isAuthenticated, async (req: any, res) => {
    try {
      // This would initiate OAuth flow with Tradovate
      res.json({ message: "Tradovate connection initiated" });
    } catch (error) {
      console.error("Error connecting to Tradovate:", error);
      res.status(500).json({ message: "Failed to connect to Tradovate" });
    }
  });

  app.post('/api/tradovate/sync', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId } = req.body;
      // This would sync trades from Tradovate API
      res.json({ message: "Sync initiated", accountId });
    } catch (error) {
      console.error("Error syncing Tradovate:", error);
      res.status(500).json({ message: "Failed to sync with Tradovate" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function isMarketOpen(date: string): boolean {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  // Simple logic: weekdays are market open, weekends are closed
  // In production, this would check against CME holiday calendar
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

async function generateInsights(userId: string, trades: any[]): Promise<any[]> {
  // This would integrate with an AI service to generate insights
  // For now, return sample insights based on trade data
  const insights = [];
  
  if (trades.length > 0) {
    const winRate = trades.filter(t => parseFloat(t.pnl || '0') > 0).length / trades.length;
    
    if (winRate < 0.5) {
      insights.push({
        type: 'risk',
        title: 'Risk Alert',
        content: 'Your win rate has decreased. Consider reviewing your entry criteria and risk management.',
      });
    }
    
    if (winRate > 0.7) {
      insights.push({
        type: 'performance',
        title: 'Performance Trend',
        content: 'Your trading performance is strong. Your current strategy is working well.',
      });
    }
    
    insights.push({
      type: 'suggestion',
      title: 'Suggestion',
      content: 'Consider keeping a more detailed journal of your trade setups to identify patterns.',
    });
  }
  
  return insights;
}

async function processAiChat(userId: string, message: string): Promise<string> {
  // This would integrate with an AI service for chat functionality
  // For now, return a simple response
  return "I'm analyzing your trading data. How can I help you improve your performance?";
}
