import type { Request, Response } from 'express';
import { db } from './db';
import { trades, userIngestTokens, journalEntries, dailyMetrics, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// TradingView webhook payload interface
interface TradingViewWebhookPayload {
  userToken: string;
  accountTag: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  qty: string | number;
  price: string | number;
  time: string;
  orderId?: string;
  screenshotUrl?: string;
  alertText?: string;
}

// Verify TradingView webhook secret
function verifyWebhookSecret(req: Request): boolean {
  const providedSecret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.TV_SECRET;
  
  if (!expectedSecret) {
    console.error('TV_SECRET not configured');
    return false;
  }
  
  return providedSecret === expectedSecret;
}

// Resolve user ID from token
async function resolveUserFromToken(token: string): Promise<string | null> {
  try {
    const [tokenRecord] = await db.select()
      .from(userIngestTokens)
      .where(eq(userIngestTokens.token, token))
      .limit(1);
    
    return tokenRecord?.userId || null;
  } catch (error) {
    console.error('Error resolving user from token:', error);
    return null;
  }
}

// Find trading account by tag
async function findTradingAccountByTag(userId: string, accountTag: string): Promise<string | null> {
  // This would implement proper account matching based on tag
  // For now, return first account - in production, match by tag pattern
  try {
    // Simple mapping of account tags to prop firms and types
    const tagMapping: Record<string, { propFirm: string, accountType: string }> = {
      'apex-eval': { propFirm: 'apex', accountType: 'eval' },
      'apex-pa': { propFirm: 'apex', accountType: 'pa' },
      'topstep-eval': { propFirm: 'topstep', accountType: 'eval' },
      'topstep-pa': { propFirm: 'topstep', accountType: 'pa' },
      'tpt-live': { propFirm: 'takeprofit', accountType: 'live' }
    };
    
    // For now, return a placeholder - in production would query tradingAccounts table
    return 'default-account-id';
  } catch (error) {
    console.error('Error finding trading account:', error);
    return null;
  }
}

// Normalize side values
function normalizeSide(side: string): 'long' | 'short' {
  const upperSide = side.toUpperCase();
  if (upperSide === 'BUY' || upperSide === 'LONG') return 'long';
  if (upperSide === 'SELL' || upperSide === 'SHORT') return 'short';
  return 'long'; // default
}

// Store TradingView screenshot
async function storeScreenshot(screenshotUrl: string, userId: string, symbol: string): Promise<string> {
  // In production, this would download and store the image
  // For now, return the URL as-is
  return screenshotUrl;
}

// Create trade intent from TradingView alert
async function createTradeIntent(userId: string, accountId: string, payload: TradingViewWebhookPayload) {
  try {
    const tradeId = nanoid();
    const executedAt = new Date(payload.time || Date.now());
    
    await db.insert(trades).values({
      id: tradeId,
      userId,
      tradingAccountId: accountId,
      symbol: payload.symbol,
      side: normalizeSide(payload.side),
      qty: String(payload.qty),
      entryPrice: String(payload.price),
      exitPrice: null,
      entryTime: executedAt,
      exitTime: null,
      fees: '0',
      pnl: null,
      source: 'tv',
      externalId: payload.orderId || `tv_${tradeId}`,
      importSource: 'tradingview_webhook'
    });
    
    return tradeId;
  } catch (error) {
    console.error('Error creating trade intent:', error);
    throw error;
  }
}

// Create journal entry with screenshot
async function createJournalEntryWithScreenshot(
  userId: string,
  accountId: string,
  payload: TradingViewWebhookPayload,
  screenshotUrl?: string
) {
  try {
    const entryDate = new Date(payload.time || Date.now()).toISOString().split('T')[0];
    const attachments = [];
    
    if (screenshotUrl) {
      attachments.push({
        type: 'image',
        url: screenshotUrl,
        meta: {
          source: 'tradingview_webhook',
          symbol: payload.symbol,
          side: payload.side,
          price: payload.price
        }
      });
    }
    
    await db.insert(journalEntries).values({
      userId,
      tradingAccountId: accountId,
      entryDate,
      title: `TradingView Alert - ${payload.symbol}`,
      body: payload.alertText || `${payload.side} ${payload.qty} ${payload.symbol} @ ${payload.price}`,
      attachments: JSON.stringify(attachments)
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }
}

// Mark day as pending reconciliation
async function markDayPendingReconcile(userId: string, accountId: string, date: Date) {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    // Update or create daily metrics with pending status
    // This is simplified - in production would use proper upsert logic
    const stats = {
      pending_reconcile: true,
      last_tv_update: new Date().toISOString()
    };
    
    // For now, just log - in production would update dailyMetrics table
    console.log(`Marked ${dateStr} as pending reconcile for account ${accountId}`);
  } catch (error) {
    console.error('Error marking day pending reconcile:', error);
  }
}

// Main TradingView webhook handler
export async function handleTradingViewWebhook(req: Request, res: Response) {
  try {
    // Verify webhook secret
    if (!verifyWebhookSecret(req)) {
      return res.status(403).json({ error: 'Invalid webhook secret' });
    }
    
    const payload: TradingViewWebhookPayload = req.body;
    
    console.log('TradingView webhook received:', {
      userToken: payload.userToken,
      symbol: payload.symbol,
      side: payload.side,
      qty: payload.qty,
      price: payload.price
    });
    
    // Resolve user
    const userId = await resolveUserFromToken(payload.userToken);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find trading account
    const accountId = await findTradingAccountByTag(userId, payload.accountTag);
    if (!accountId) {
      return res.status(404).json({ error: 'Trading account not found' });
    }
    
    // Create trade intent
    const tradeId = await createTradeIntent(userId, accountId, payload);
    
    // Handle screenshot if provided
    let storedScreenshotUrl;
    if (payload.screenshotUrl) {
      storedScreenshotUrl = await storeScreenshot(payload.screenshotUrl, userId, payload.symbol);
    }
    
    // Create journal entry with screenshot
    await createJournalEntryWithScreenshot(userId, accountId, payload, storedScreenshotUrl);
    
    // Mark day as pending reconciliation
    const tradeDate = new Date(payload.time || Date.now());
    await markDayPendingReconcile(userId, accountId, tradeDate);
    
    console.log(`TradingView webhook processed: trade ${tradeId} created`);
    
    res.json({
      success: true,
      tradeId,
      message: 'TradingView alert processed successfully'
    });
    
  } catch (error) {
    console.error('TradingView webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Get webhook configuration for user
export async function getTradingViewWebhookConfig(req: Request, res: Response) {
  try {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Ensure user exists first
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate or get existing token
    let token;
    const [existing] = await db.select()
      .from(userIngestTokens)
      .where(eq(userIngestTokens.userId, userId))
      .limit(1);
    
    if (existing && existing.isActive) {
      token = existing.token;
    } else {
      token = nanoid(10);
      await db.insert(userIngestTokens).values({
        userId,
        token,
        isActive: true
      });
    }
    
    const baseUrl = process.env.APP_BASE_URL || 'https://your-domain.replit.app';
    const webhookUrl = `${baseUrl}/api/ingest/tradingview`;
    
    // Example TradingView alert message template
    const alertTemplate = {
      userToken: token,
      accountTag: "{{plot('AccountTag')}}",
      symbol: "{{ticker}}",
      side: "{{strategy.order.action}}",
      qty: "{{strategy.order.contracts}}",
      price: "{{close}}",
      time: "{{timenow}}",
      orderId: "{{strategy.order.id}}",
      alertText: "{{plot('AlertText')}}"
    };
    
    res.json({
      webhookUrl,
      secret: process.env.TV_SECRET,
      userToken: token,
      alertTemplate,
      instructions: [
        "1. Copy the webhook URL above",
        "2. In TradingView, create a new alert",
        "3. Set webhook URL as the notification method",
        "4. Use the alert template JSON in the message field",
        "5. Replace AccountTag with your account identifier (e.g., 'apex-pa')",
        "6. Enable 'Send Webhook' in alert settings"
      ]
    });
    
  } catch (error) {
    console.error('Error getting webhook config:', error);
    res.status(500).json({ error: 'Failed to get webhook configuration' });
  }
}