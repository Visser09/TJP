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
import { generateTradingInsights, generateChatResponse } from './openai';
import { tradovateAPI } from './tradovate';

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
      const { accountId } = req.body;
      const trades = await storage.getRecentTrades(userId, accountId, 100);
      const insights = await generateInsights(userId, trades, accountId);
      
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

  app.post('/api/ai-chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { message, accountId, conversationHistory } = req.body;
      
      // Generate AI response using OpenAI
      const response = await generateChatResponse(message, accountId, conversationHistory, userId);
      
      res.json({ response });
    } catch (error) {
      console.error("Error processing AI chat:", error);
      res.status(500).json({ message: "Failed to process AI chat" });
    }
  });

  // Tradovate integration
  app.post('/api/tradovate/auth', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, credentials } = req.body;
      
      const { accessToken, refreshToken } = await tradovateAPI.authenticate(credentials);
      
      // Update account with tokens
      await storage.updateTradingAccount(accountId, {
        tradovateAccessToken: accessToken,
        tradovateRefreshToken: refreshToken,
        lastSyncAt: new Date(),
      });
      
      res.json({ message: "Successfully connected to Tradovate" });
    } catch (error) {
      console.error("Error authenticating with Tradovate:", error);
      res.status(500).json({ message: "Failed to authenticate with Tradovate" });
    }
  });

  app.post('/api/tradovate/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId } = req.body;
      
      const account = await storage.getTradingAccount(accountId);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }

      if (!account.tradovateAccessToken) {
        return res.status(400).json({ message: "Account not connected to Tradovate" });
      }

      // Set tokens for API calls
      tradovateAPI.accessToken = account.tradovateAccessToken;
      tradovateAPI.refreshToken = account.tradovateRefreshToken;

      // Get Tradovate account ID from external account mapping
      const tradovateAccounts = await tradovateAPI.getAccounts();
      const matchingAccount = tradovateAccounts.find(acc => 
        acc.name.includes(account.propFirm) || acc.accountType === account.accountType
      );

      if (!matchingAccount) {
        return res.status(404).json({ message: "No matching Tradovate account found" });
      }

      // Sync trades from Tradovate
      const tradovateTrades = await tradovateAPI.syncAccountTrades(matchingAccount.id);
      
      let syncedCount = 0;
      for (const tradovateeTrade of tradovateTrades) {
        // Check if trade already exists
        const existingTrade = await storage.getTradeByExternalId(userId, accountId, tradovateeTrade.id.toString());
        
        if (!existingTrade) {
          await storage.createTrade({
            userId,
            tradingAccountId: accountId,
            symbol: tradovateeTrade.symbol,
            side: tradovateeTrade.side.toLowerCase() as 'long' | 'short',
            qty: tradovateeTrade.quantity.toString(),
            entryPrice: tradovateeTrade.price.toString(),
            exitPrice: tradovateeTrade.price.toString(),
            entryTime: new Date(tradovateeTrade.timestamp),
            exitTime: new Date(tradovateeTrade.timestamp),
            fees: tradovateeTrade.commission.toString(),
            pnl: tradovateeTrade.pnl.toString(),
            tags: JSON.stringify(['tradovate-sync']),
          });
          syncedCount++;
        }
      }

      // Update last sync time
      await storage.updateTradingAccount(accountId, {
        lastSyncAt: new Date(),
      });

      res.json({ message: `Synced ${syncedCount} new trades from Tradovate`, syncedTrades: syncedCount });
    } catch (error) {
      console.error("Error syncing with Tradovate:", error);
      res.status(500).json({ message: "Failed to sync with Tradovate" });
    }
  });

  app.get('/api/tradovate/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId } = req.query;
      
      const account = await storage.getTradingAccount(accountId as string);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Account not found" });
      }

      if (!account.tradovateAccessToken) {
        return res.status(400).json({ message: "Account not connected to Tradovate" });
      }

      tradovateAPI.accessToken = account.tradovateAccessToken;
      tradovateAPI.refreshToken = account.tradovateRefreshToken;

      const accounts = await tradovateAPI.getAccounts();
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching Tradovate accounts:", error);
      res.status(500).json({ message: "Failed to fetch Tradovate accounts" });
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

async function generateInsights(userId: string, trades: any[], accountId?: string): Promise<any[]> {
  try {
    const journalEntries = await storage.getJournalEntries(userId, undefined, accountId);
    const aiInsights = await generateTradingInsights(trades, journalEntries);
    
    return [
      {
        type: 'performance',
        title: 'Performance Analysis',
        content: aiInsights.performance,
        severity: 'medium',
        actionable: true,
      },
      {
        type: 'risk',
        title: 'Risk Assessment',
        content: aiInsights.risk,
        severity: 'high',
        actionable: true,
      },
      {
        type: 'pattern',
        title: 'Pattern Recognition',
        content: aiInsights.patterns,
        severity: 'low',
        actionable: false,
      },
      {
        type: 'suggestion',
        title: 'AI Suggestions',
        content: aiInsights.suggestions,
        severity: 'medium',
        actionable: true,
      },
    ];
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [
      {
        type: 'suggestion',
        title: 'Trading Journal',
        content: 'Continue trading and journaling to get personalized AI insights.',
        severity: 'low',
        actionable: true,
      },
    ];
  }
}

async function processAiChat(userId: string, message: string): Promise<string> {
  // This would integrate with an AI service for chat functionality
  // For now, return a simple response
  return "I'm analyzing your trading data. How can I help you improve your performance?";
}
