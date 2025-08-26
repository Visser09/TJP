import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { handleEmailIngest, emailIngestMiddleware, generateIngestToken } from "./emailIngest";
import { handleTradingViewWebhook, getTradingViewWebhookConfig } from "./tradingviewWebhook";
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
import multer from "multer";
import {
  parseCsvFile,
  detectCsvFormat,
  importCsvTrades,
  saveMappingProfile,
  getMappingProfiles,
  type MappingSpec
} from "./csvImport";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize multer for file uploads
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
      const { accountId, startDate, endDate } = req.query;
      const trades = await storage.getTrades(
        userId,
        accountId as string,
        startDate as string,
        endDate as string
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

  // Journal entries
  app.get('/api/journal-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { date, accountId } = req.query;
      const entries = await storage.getJournalEntries(userId, date as string, accountId as string);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post('/api/journal-entries', isAuthenticated, async (req: any, res) => {
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
        res.status(400).json({ message: "Invalid entry data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create journal entry" });
      }
    }
  });

  // Daily metrics
  app.get('/api/daily-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, startDate, endDate } = req.query;
      const metrics = await storage.getDailyMetrics(
        userId,
        accountId as string
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching daily metrics:", error);
      res.status(500).json({ message: "Failed to fetch daily metrics" });
    }
  });

  // Economic events
  app.get('/api/economic-events', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const events = await storage.getEconomicEvents(startDate as string);
      res.json(events);
    } catch (error) {
      console.error("Error fetching economic events:", error);
      res.status(500).json({ message: "Failed to fetch economic events" });
    }
  });

  app.post('/api/economic-events', isAuthenticated, async (req: any, res) => {
    try {
      const eventData = insertEconomicEventSchema.parse(req.body);
      const event = await storage.createEconomicEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating economic event:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid event data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create economic event" });
      }
    }
  });

  // Analytics
  app.get('/api/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, period = '30d' } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const [trades, dailyMetrics] = await Promise.all([
        storage.getTrades(userId, accountId as string, startDate.toISOString().split('T')[0]),
        storage.getDailyMetrics(userId, accountId as string, startDate.toISOString().split('T')[0])
      ]);

      // Calculate analytics
      const totalTrades = trades.length;
      const winningTrades = trades.filter((t: any) => t.realizedPnl > 0).length;
      const losingTrades = trades.filter((t: any) => t.realizedPnl < 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      const totalPnl = trades.reduce((sum: number, trade: any) => sum + trade.realizedPnl, 0);
      const totalFees = trades.reduce((sum: number, trade: any) => sum + (trade.fees || 0), 0);
      const netPnl = totalPnl - totalFees;

      const avgWin = winningTrades > 0 ? 
        trades.filter((t: any) => t.realizedPnl > 0).reduce((sum: number, t: any) => sum + t.realizedPnl, 0) / winningTrades : 0;
      const avgLoss = losingTrades > 0 ? 
        Math.abs(trades.filter((t: any) => t.realizedPnl < 0).reduce((sum: number, t: any) => sum + t.realizedPnl, 0) / losingTrades) : 0;

      const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

      // Trading calendar data
      const calendarData = dailyMetrics.map((metric: any) => ({
        date: metric.date,
        pnl: metric.totalPnl - metric.totalFees,
        trades: metric.totalTrades,
        winRate: metric.totalTrades > 0 ? (metric.winningTrades / metric.totalTrades) * 100 : 0,
        isMarketOpen: isMarketOpen(metric.date)
      }));

      // Performance chart data
      let runningPnl = 0;
      const performanceData = calendarData.map((day: any) => {
        runningPnl += day.pnl;
        return {
          date: day.date,
          cumulativePnl: runningPnl,
          dailyPnl: day.pnl
        };
      });

      res.json({
        summary: {
          totalTrades,
          winningTrades,
          losingTrades,
          winRate: Math.round(winRate * 100) / 100,
          totalPnl: Math.round(totalPnl * 100) / 100,
          totalFees: Math.round(totalFees * 100) / 100,
          netPnl: Math.round(netPnl * 100) / 100,
          avgWin: Math.round(avgWin * 100) / 100,
          avgLoss: Math.round(avgLoss * 100) / 100,
          profitFactor: Math.round(profitFactor * 100) / 100
        },
        calendarData,
        performanceData
      });
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ message: "Failed to generate analytics" });
    }
  });

  // AI insights
  app.get('/api/ai-insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId } = req.query;
      
      const trades = await storage.getTrades(userId, accountId as string);
      const insights = await generateInsights(userId, trades, accountId as string);
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  // AI chat
  app.post('/api/ai-chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get user's recent trades and journal entries for context
      const [trades, journalEntries] = await Promise.all([
        storage.getTrades(userId, context?.accountId),
        storage.getJournalEntries(userId, undefined, context?.accountId)
      ]);

      const response = await generateChatResponse(message, context?.accountId, [{ role: 'user', content: message }], userId);
      
      res.json({ response });
    } catch (error) {
      console.error("Error processing AI chat:", error);
      res.status(500).json({ message: "Failed to process AI chat" });
    }
  });

  // Tradovate integration
  app.post('/api/tradovate/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, credentials } = req.body;
      
      if (!accountId || !credentials) {
        return res.status(400).json({ message: "Account ID and credentials are required" });
      }

      // This would integrate with Tradovate API
      const result = { message: 'Tradovate sync not yet implemented', accountId };
      
      res.json(result);
    } catch (error) {
      console.error("Error syncing with Tradovate:", error);
      res.status(500).json({ message: "Failed to sync with Tradovate" });
    }
  });

  // CSV Import routes
  app.get('/api/import/mappings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const profiles = await getMappingProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error('Error fetching mapping profiles:', error);
      res.status(500).json({ message: 'Failed to fetch mapping profiles' });
    }
  });

  app.post('/api/import/csv/preview', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      const rows = await parseCsvFile(req.file.buffer);
      const headers = Object.keys(rows[0] || {});
      const detected = detectCsvFormat(headers);
      res.json({
        headers,
        previewRows: rows.slice(0, 100),
        totalRows: rows.length,
        detectedFormat: detected || undefined,
        filename: req.file.originalname,
      });
    } catch (error) {
      console.error('CSV preview error:', error);
      res.status(500).json({ message: 'Failed to preview CSV' });
    }
  });

  app.post('/api/import/csv', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.dbUserId || req.user.claims.sub;
      const { accountId, source, mapping: mappingJson, saveMapping, mappingName } = req.body;
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      if (!accountId) return res.status(400).json({ message: 'Missing accountId' });

      const rows = await parseCsvFile(req.file.buffer);
      const headers = Object.keys(rows[0] || {});

      let mapping: MappingSpec;
      try {
        mapping = JSON.parse(mappingJson);
      } catch {
        return res.status(400).json({ message: 'Invalid mapping JSON' });
      }

      const detected = source || (detectCsvFormat(headers)?.source ?? 'custom');
      const result = await importCsvTrades(userId, accountId, rows, mapping, detected);

      if (saveMapping === 'true' && mappingName) {
        await saveMappingProfile(userId, mappingName, detected, mapping);
      }

      res.json(result);
    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ message: 'Failed to import CSV' });
    }
  });

  // Email ingestion endpoints
  app.post('/api/ingest/email', emailIngestMiddleware, handleEmailIngest);
  
  // TradingView webhook endpoints
  app.post('/api/ingest/tradingview', handleTradingViewWebhook);
  app.get('/api/settings/tradingview-webhook', isAuthenticated, getTradingViewWebhookConfig);
  
  // User ingest token endpoint
  app.get('/api/settings/ingest-token', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const token = await generateIngestToken(userId);
      const baseUrl = process.env.APP_BASE_URL || 'https://your-domain.replit.app';
      const forwardingAddress = `user+${token}@ingest.yourdomain.com`;
      
      res.json({
        token,
        forwardingAddress,
        instructions: [
          "Forward your prop firm daily statement emails to this address",
          "Forward TradingView alert emails with screenshots to this address",
          "Data will be automatically imported into your journal"
        ]
      });
    } catch (error) {
      console.error('Error getting ingest token:', error);
      res.status(500).json({ error: 'Failed to get ingest token' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}