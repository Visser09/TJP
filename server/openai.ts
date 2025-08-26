import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTradingInsights(trades: any[], journalEntries: any[]): Promise<{
  performance: string;
  risk: string;
  patterns: string;
  suggestions: string;
}> {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert futures trading coach specializing in prop firm trading (Apex, TopStep, Take Profit Trader). 
          
          Use these professional trading rules as your knowledge base:
          
          GENERAL RULES:
          - Start with micros (MES/MNQ/M2K/MGC); 1 contract until expectancy is proven
          - Journal template per trade: date/time, instrument, setup tag, thesis, entry/stop/target, size, risk (R), result (R), MFE/MAE, hold time, slippage, adherence score (0–1), screenshot
          - Weekly review: promote top 1–2 setups by expectancy; pause or refine bottom setups; write one rule change max per week
          - Prop firm checklist: trade ≥5 days, avoid outsized single-day gains, stay flat into restricted times, document rule compliance per day
          
          RISK MANAGEMENT:
          - Per-trade risk: 0.25–0.5% of account or 10–20% of daily drawdown limit (use smaller)
          - Daily stop: min(1.5R, 40% of daily DD); stop trading immediately when hit
          - Session guardrails: max 3–5 trades/day; after 2 consecutive losses, pause or stop
          - Use hard brackets on entry (OCO): predefined stop and target; target R:R ≥ 1:1.5
          - Scale only after 4–5 green days with peak-to-trough DD < 0.5× daily DD; increase size by 1 contract
          - News risk: flat 3–5 minutes before/after high-impact releases (CPI, FOMC, NFP)
          
          PATTERN RECOGNITION:
          - Time-of-day edge: compare first 60 minutes vs midday vs late session performance
          - Day-type filter: trend vs range; use ATR or opening range break to classify
          - Instrument-specific: evaluate ES vs NQ vs CL/MGC micros for volatility vs slippage trade-offs
          - Flag execution errors: chasing after missed move, moving stops, adding to losers, revenge trading after -2R days
          - Consistency risk: single-day PnL > 40% of total over period can fail prop 'consistency' rules
          
          Provide insights in JSON format with categories: performance, risk, patterns, and suggestions.
          Keep each insight specific, actionable, and aligned with prop firm requirements.`
        },
        {
          role: "user",
          content: `Analyze this trading data:
          
          Recent trades: ${JSON.stringify(trades.slice(-10), null, 2)}
          Recent journal entries: ${JSON.stringify(journalEntries.slice(-5), null, 2)}
          
          Provide insights in JSON format with keys: performance, risk, patterns, suggestions`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      performance: result.performance || "Analyze more trades to generate performance insights.",
      risk: result.risk || "Maintain proper risk management with stop losses.",
      patterns: result.patterns || "Continue trading to identify patterns.",
      suggestions: result.suggestions || "Focus on consistent trading strategies."
    };
  } catch (error) {
    console.error("Error generating trading insights:", error);
    return {
      performance: "Unable to generate performance insights at this time.",
      risk: "Always use proper risk management techniques.",
      patterns: "Track your trades consistently for pattern analysis.",
      suggestions: "Keep journaling your trades for better insights."
    };
  }
}

export async function generateChatResponse(message: string, accountId?: string, conversationHistory: any[] = []): Promise<string> {
  try {
    // Build context from conversation history
    const historyMessages = conversationHistory.slice(-8).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert futures trading coach specializing in prop firm trading (Apex, TopStep, Take Profit Trader).
          
          CORE COACHING PRINCIPLES:
          - Start with micros (MES/MNQ/M2K/MGC); 1 contract until expectancy is proven
          - Per-trade risk: 0.25–0.5% of account or 10–20% of daily drawdown limit
          - Daily stop: min(1.5R, 40% of daily DD); stop trading immediately when hit
          - Session guardrails: max 3–5 trades/day; after 2 consecutive losses, pause
          - Hard brackets on entry (OCO): predefined stop and target; R:R ≥ 1:1.5
          - Prop firm compliance: trade ≥5 days, avoid outsized single-day gains, stay flat into restricted times
          
          COACHING AREAS:
          - Risk management and position sizing
          - Prop firm rule compliance and consistency
          - Trading psychology and discipline
          - Setup development and backtesting
          - Performance analysis and improvement
          - Market timing and execution quality
          
          Keep responses helpful, specific, and actionable. Focus on building consistent, profitable habits that align with prop firm requirements. Be encouraging but emphasize discipline and risk management above all.
          ${accountId ? `User's current account ID: ${accountId}` : ''}`
        },
        ...historyMessages,
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm experiencing some technical difficulties. Please try again in a moment.";
  }
}

export async function analyzeTradePerformance(trade: any): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a futures trading expert. Analyze this trade and provide concise feedback in 2-3 sentences."
        },
        {
          role: "user",
          content: `Trade details:
          Symbol: ${trade.symbol}
          Side: ${trade.side}
          Entry: ${trade.entryPrice}
          Exit: ${trade.exitPrice}
          P&L: ${trade.pnl}
          Duration: ${trade.exitTime ? new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime() : 'Still open'}ms`
        }
      ],
    });

    return response.choices[0].message.content || "Trade analysis unavailable.";
  } catch (error) {
    console.error("Error analyzing trade:", error);
    return "Unable to analyze trade at this time.";
  }
}