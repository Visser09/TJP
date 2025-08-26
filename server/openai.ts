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
          content: `You are an expert futures trading coach analyzing a trader's performance data. 
          Provide insights in JSON format with these categories: performance, risk, patterns, and suggestions.
          Keep each insight concise but actionable. Focus on futures trading strategies and prop firm requirements.`
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
          content: `You are an expert futures trading coach and mentor. You help traders with:
          - Trading strategy analysis and improvement
          - Risk management techniques
          - Prop firm requirements and best practices (Apex, TopStep, Take Profit Trader)
          - Trade psychology and emotional control
          - Technical analysis and market patterns
          - Performance review and goal setting
          
          Keep responses helpful, specific, and actionable. Focus on futures trading.
          Be encouraging but honest about areas for improvement.
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