import { z } from "zod";
import csv from "csv-parser";
import { Readable } from "stream";
import { createHash } from "node:crypto";
import { db } from "./db";
import { trades, dailyMetrics, csvMappingProfiles } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// CSV parsing interfaces
export interface CsvRow {
  [key: string]: string;
}

export interface ParsedTrade {
  symbol: string;
  side: 'long' | 'short';
  qty: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: Date;
  exitTime?: Date;
  fees: number;
  pnl?: number;
  brokerExecutionId?: string;
}

export interface MappingSpec {
  symbol: string;
  side: string;
  qty: string;
  entryPrice: string;
  exitPrice?: string;
  entryTime: string;
  exitTime?: string;
  fees?: string;
  pnl?: string;
  brokerExecutionId?: string;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  daysTouched: string[];
  errors: string[];
}

// Auto-detection patterns for different prop firms
const APEX_PATTERNS = {
  headers: ['Entry Time', 'Exit Time', 'Contract', 'P/L', 'Commissions', 'Side'],
  mappings: {
    symbol: 'Contract',
    side: 'Side',
    qty: 'Qty',
    entryPrice: 'Entry Price',
    exitPrice: 'Exit Price',
    entryTime: 'Entry Time',
    exitTime: 'Exit Time',
    fees: 'Commissions',
    pnl: 'P/L'
  }
};

const TOPSTEP_PATTERNS = {
  headers: ['Instrument', 'Quantity', 'Buy/Sell', 'PnL', 'Fees'],
  mappings: {
    symbol: 'Instrument',
    side: 'Buy/Sell',
    qty: 'Quantity',
    entryPrice: 'Entry Price',
    exitPrice: 'Exit Price',
    entryTime: 'Time',
    exitTime: 'Exit Time',
    fees: 'Fees',
    pnl: 'PnL'
  }
};

const TPT_PATTERNS = {
  headers: ['Symbol', 'Side', 'Filled Qty', 'Avg Price', 'Realized PnL'],
  mappings: {
    symbol: 'Symbol',
    side: 'Side',
    qty: 'Filled Qty',
    entryPrice: 'Avg Price',
    exitPrice: 'Exit Price',
    entryTime: 'Time',
    exitTime: 'Exit Time',
    fees: 'Fees',
    pnl: 'Realized PnL'
  }
};

export function detectCsvFormat(headers: string[]): { source: string; mapping: MappingSpec } | null {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  
  // Check for Apex patterns
  const apexMatches = APEX_PATTERNS.headers.filter(h => 
    headerSet.has(h.toLowerCase())
  ).length;
  if (apexMatches >= 4) {
    return { source: 'apex', mapping: APEX_PATTERNS.mappings as MappingSpec };
  }
  
  // Check for TopStep patterns
  const topstepMatches = TOPSTEP_PATTERNS.headers.filter(h => 
    headerSet.has(h.toLowerCase())
  ).length;
  if (topstepMatches >= 4) {
    return { source: 'topstep', mapping: TOPSTEP_PATTERNS.mappings as MappingSpec };
  }
  
  // Check for TPT patterns
  const tptMatches = TPT_PATTERNS.headers.filter(h => 
    headerSet.has(h.toLowerCase())
  ).length;
  if (tptMatches >= 4) {
    return { source: 'tpt', mapping: TPT_PATTERNS.mappings as MappingSpec };
  }
  
  return null;
}

export function normalizeValue(value: string, type: 'number' | 'date' | 'side' | 'symbol'): any {
  if (!value || value.trim() === '') return null;
  
  value = value.trim();
  
  switch (type) {
    case 'number':
      // Remove $ signs, commas, and parse as float
      const cleaned = value.replace(/[\$,]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
      
    case 'date':
      // Parse various date formats, assume ET timezone if none specified
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
      
    case 'side':
      // Normalize to 'long' or 'short'
      const lower = value.toLowerCase();
      if (lower.includes('buy') || lower.includes('long')) return 'long';
      if (lower.includes('sell') || lower.includes('short')) return 'short';
      return lower === 'long' || lower === 'short' ? lower : 'long';
      
    case 'symbol':
      // Keep raw symbol for now, could normalize futures contracts later
      return value.toUpperCase();
      
    default:
      return value;
  }
}

export function parseCsvRow(row: CsvRow, mapping: MappingSpec): ParsedTrade | null {
  try {
    const symbol = normalizeValue(row[mapping.symbol], 'symbol');
    const side = normalizeValue(row[mapping.side], 'side');
    const qty = normalizeValue(row[mapping.qty], 'number');
    const entryPrice = normalizeValue(row[mapping.entryPrice], 'number');
    const entryTime = normalizeValue(row[mapping.entryTime], 'date');
    
    if (!symbol || !side || !qty || !entryPrice || !entryTime) {
      return null; // Missing required fields
    }
    
    const exitPrice = mapping.exitPrice ? normalizeValue(row[mapping.exitPrice], 'number') : null;
    const exitTime = mapping.exitTime ? normalizeValue(row[mapping.exitTime], 'date') : null;
    const fees = mapping.fees ? normalizeValue(row[mapping.fees], 'number') : 0;
    const pnl = mapping.pnl ? normalizeValue(row[mapping.pnl], 'number') : null;
    const brokerExecutionId = mapping.brokerExecutionId ? row[mapping.brokerExecutionId] : null;
    
    return {
      symbol,
      side,
      qty,
      entryPrice,
      exitPrice,
      entryTime,
      exitTime,
      fees,
      pnl,
      brokerExecutionId
    };
  } catch (error) {
    console.error('Error parsing CSV row:', error);
    return null;
  }
}

export function generateRowHash(trade: ParsedTrade, accountId: string): string {
  const hashString = `${accountId}-${trade.symbol}-${trade.side}-${trade.qty}-${trade.entryTime?.getTime()}-${trade.exitTime?.getTime()}-${trade.entryPrice}-${trade.exitPrice}`;
  return createHash('sha256').update(hashString).digest('hex');
}

export async function parseCsvFile(fileBuffer: Buffer): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const results: CsvRow[] = [];
    const stream = Readable.from(fileBuffer);
    
    stream
      .pipe(csv())
      .on('data', (data: CsvRow) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

export async function importCsvTrades(
  userId: string,
  accountId: string,
  rows: CsvRow[],
  mapping: MappingSpec,
  source: string
): Promise<ImportResult> {
  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    daysTouched: [],
    errors: []
  };
  
  const daysTouchedSet = new Set<string>();
  
  for (const row of rows) {
    try {
      const parsedTrade = parseCsvRow(row, mapping);
      if (!parsedTrade) {
        result.errors.push(`Failed to parse row: ${JSON.stringify(row)}`);
        continue;
      }
      
      const rowHash = generateRowHash(parsedTrade, accountId);
      
      // Check if trade already exists
      const existingTrade = await db
        .select()
        .from(trades)
        .where(eq(trades.rowHash, rowHash))
        .limit(1);
      
      const tradeData = {
        userId,
        tradingAccountId: accountId,
        symbol: parsedTrade.symbol,
        side: parsedTrade.side,
        qty: parsedTrade.qty.toString(),
        entryPrice: parsedTrade.entryPrice.toString(),
        exitPrice: parsedTrade.exitPrice?.toString() || undefined,
        entryTime: parsedTrade.entryTime,
        exitTime: parsedTrade.exitTime,
        fees: parsedTrade.fees.toString(),
        pnl: parsedTrade.pnl?.toString(),
        brokerExecutionId: parsedTrade.brokerExecutionId,
        rowHash,
        importSource: source
      };
      
      if (existingTrade.length > 0) {
        // Update existing trade
        await db
          .update(trades)
          .set(tradeData)
          .where(eq(trades.id, existingTrade[0].id));
        result.updated++;
      } else {
        // Insert new trade
        await db.insert(trades).values(tradeData);
        result.inserted++;
      }
      
      // Track days that need metrics recalculation
      const tradeDate = parsedTrade.entryTime.toISOString().split('T')[0];
      daysTouchedSet.add(tradeDate);
      
    } catch (error) {
      result.errors.push(`Error processing row: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  result.daysTouched = Array.from(daysTouchedSet);
  
  // Recalculate daily metrics for affected days
  await recalculateDailyMetrics(userId, accountId, result.daysTouched);
  
  return result;
}

async function recalculateDailyMetrics(userId: string, accountId: string, dates: string[]) {
  for (const date of dates) {
    try {
      // Get all trades for this date
      const dayTrades = await db
        .select()
        .from(trades)
        .where(
          and(
            eq(trades.userId, userId),
            eq(trades.tradingAccountId, accountId)
          )
        );
      
      if (dayTrades.length === 0) continue;
      
      // Calculate metrics
      let grossPnl = 0;
      let netPnl = 0;
      let winCount = 0;
      let lossCount = 0;
      
      for (const trade of dayTrades) {
        const tradePnl = parseFloat(trade.pnl || '0');
        const tradeFees = parseFloat(trade.fees || '0');
        
        grossPnl += tradePnl;
        netPnl += tradePnl - tradeFees;
        
        if (tradePnl > 0) winCount++;
        else if (tradePnl < 0) lossCount++;
      }
      
      // Upsert daily metrics
      const existingMetrics = await db
        .select()
        .from(dailyMetrics)
        .where(
          and(
            eq(dailyMetrics.userId, userId),
            eq(dailyMetrics.tradingAccountId, accountId),
            eq(dailyMetrics.tradeDate, date)
          )
        )
        .limit(1);
      
      const metricsData = {
        userId,
        tradingAccountId: accountId,
        tradeDate: date,
        grossPnl: grossPnl.toString(),
        netPnl: netPnl.toString(),
        winCount,
        lossCount,
        stats: JSON.stringify({ tradeCount: dayTrades.length })
      };
      
      if (existingMetrics.length > 0) {
        await db
          .update(dailyMetrics)
          .set(metricsData)
          .where(eq(dailyMetrics.id, existingMetrics[0].id));
      } else {
        await db.insert(dailyMetrics).values(metricsData);
      }
    } catch (error) {
      console.error(`Error recalculating metrics for ${date}:`, error);
    }
  }
}

export async function saveMappingProfile(
  userId: string,
  name: string,
  source: string,
  mapping: MappingSpec
): Promise<void> {
  await db.insert(csvMappingProfiles).values({
    userId,
    name,
    source,
    mapping: JSON.stringify(mapping)
  });
}

export async function getMappingProfiles(userId: string): Promise<any[]> {
  const profiles = await db
    .select()
    .from(csvMappingProfiles)
    .where(eq(csvMappingProfiles.userId, userId));
  
  return profiles.map(p => ({
    ...p,
    mapping: JSON.parse(p.mapping as string)
  }));
}