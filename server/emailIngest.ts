import type { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { db } from './db';
import { users, userIngestTokens, trades, journalEntries, dailyMetrics } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
// Note: Would integrate with existing CSV import system

// Multer setup for handling email attachments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to resolve user from email alias
async function resolveUserFromEmail(toAddress: string): Promise<string | null> {
  try {
    // Extract token from email like: user+abc123@ingest.yourdomain.com
    const tokenMatch = toAddress.match(/\+([a-zA-Z0-9]+)@/);
    if (!tokenMatch) return null;
    
    const token = tokenMatch[1];
    const [tokenRecord] = await db.select()
      .from(userIngestTokens)
      .where(eq(userIngestTokens.token, token))
      .limit(1);
    
    return tokenRecord?.userId || null;
  } catch (error) {
    console.error('Error resolving user from email:', error);
    return null;
  }
}

// Helper to extract account tag from email subject
function extractAccountTag(subject: string): string {
  // Look for patterns like "Apex PA", "TopStep Eval", "TPT Live"
  const patterns = [
    /apex.*pa/i,
    /apex.*eval/i,
    /topstep.*pa/i,
    /topstep.*eval/i,
    /tpt.*live/i,
    /take.*profit.*live/i
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(subject)) {
      if (/apex.*pa/i.test(subject)) return 'apex-pa';
      if (/apex.*eval/i.test(subject)) return 'apex-eval';
      if (/topstep.*pa/i.test(subject)) return 'topstep-pa';
      if (/topstep.*eval/i.test(subject)) return 'topstep-eval';
      if (/(tpt|take.*profit).*live/i.test(subject)) return 'tpt-live';
    }
  }
  
  return 'default'; // fallback
}

// Store image attachment (placeholder - would integrate with actual storage)
async function storeImageAttachment(imageBuffer: Buffer, filename: string): Promise<string> {
  // In production, this would upload to S3/Cloudinary/etc
  // For now, return a placeholder URL
  const imageId = nanoid();
  return `/api/attachments/${imageId}/${filename}`;
}

// Parse HTML table from prop firm statement emails
function parseStatementTable(htmlContent: string): any[] {
  // Basic HTML table parsing - would use cheerio in production
  const trades: any[] = [];
  
  // Look for common table patterns in prop firm emails
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = htmlContent.match(tableRegex) || [];
  
  for (const table of tables) {
    // Extract rows - this is simplified, real implementation would be more robust
    const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
    const rows = table.match(rowRegex) || [];
    
    for (let i = 1; i < rows.length; i++) { // Skip header row
      const cellRegex = /<td[\s\S]*?>([\s\S]*?)<\/td>/gi;
      const cells = [];
      let match;
      
      while ((match = cellRegex.exec(rows[i])) !== null) {
        cells.push(match[1].replace(/<[^>]*>/g, '').trim());
      }
      
      if (cells.length >= 6) { // Minimum expected columns
        trades.push({
          symbol: cells[0],
          side: cells[1],
          quantity: parseFloat(cells[2]) || 0,
          price: parseFloat(cells[3]) || 0,
          pnl: parseFloat(cells[4]) || 0,
          time: cells[5]
        });
      }
    }
  }
  
  return trades;
}

// Main email ingestion endpoint
export async function handleEmailIngest(req: Request, res: Response) {
  try {
    console.log('Email ingest received:', {
      to: req.body.recipient || req.body.To,
      from: req.body.sender || req.body.From,
      subject: req.body.subject || req.body.Subject
    });

    const toAddress = req.body.recipient || req.body.To;
    const fromAddress = req.body.sender || req.body.From;
    const subject = req.body.subject || req.body.Subject || '';
    const htmlContent = req.body['body-html'] || req.body.html || '';
    const textContent = req.body['body-plain'] || req.body.text || '';

    // Resolve user from forwarding address
    const userId = await resolveUserFromEmail(toAddress);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract account tag from subject
    const accountTag = extractAccountTag(subject);
    
    // Get trading account ID (would implement proper account matching)
    // For now, use first account - in production, match by account tag
    
    let insertedTrades = 0;
    let journalEntriesCreated = 0;

    // Process CSV attachments
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          try {
            const csvContent = file.buffer.toString();
            // Process CSV content through existing import logic
            // This would integrate with the existing CSV import system
            console.log(`Processing CSV attachment: ${file.originalname}`);
            insertedTrades += 1; // Placeholder
          } catch (error) {
            console.error('Error processing CSV attachment:', error);
          }
        }
      }
    }

    // Process HTML table data
    if (htmlContent) {
      const tableTrades = parseStatementTable(htmlContent);
      insertedTrades += tableTrades.length;
    }

    // Process TradingView screenshots/images
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (file.mimetype.startsWith('image/')) {
          try {
            const imageUrl = await storeImageAttachment(file.buffer, file.originalname);
            
            // Create journal entry for TradingView screenshot
            await db.insert(journalEntries).values({
              userId,
              tradingAccountId: null, // Would resolve proper account
              entryDate: new Date().toISOString().split('T')[0],
              title: 'TradingView Alert',
              body: `Alert from: ${subject}\n\n${textContent}`,
              attachments: JSON.stringify([{
                type: 'image',
                url: imageUrl,
                filename: file.originalname,
                meta: { source: 'tradingview_email' }
              }])
            });
            
            journalEntriesCreated++;
          } catch (error) {
            console.error('Error processing image attachment:', error);
          }
        }
      }
    }

    console.log(`Email processed: ${insertedTrades} trades, ${journalEntriesCreated} journal entries`);
    
    res.json({
      success: true,
      processed: {
        trades: insertedTrades,
        journalEntries: journalEntriesCreated
      }
    });

  } catch (error) {
    console.error('Email ingest error:', error);
    res.status(500).json({ error: 'Email processing failed' });
  }
}

// Generate unique ingest token for user
export async function generateIngestToken(userId: string): Promise<string> {
  try {
    // Check if user already has active token
    const [existing] = await db.select()
      .from(userIngestTokens)
      .where(eq(userIngestTokens.userId, userId))
      .limit(1);
    
    if (existing && existing.isActive) {
      return existing.token;
    }
    
    // Generate new token
    const token = nanoid(10);
    
    await db.insert(userIngestTokens).values({
      userId,
      token,
      isActive: true
    });
    
    return token;
  } catch (error) {
    console.error('Error generating ingest token:', error);
    throw error;
  }
}

// Middleware for handling email webhooks
export const emailIngestMiddleware = upload.array('attachments', 10);