// Tradovate API Integration
const TRADOVATE_API_BASE = 'https://live-api-d.tradovate.com/v1';
const TRADOVATE_AUTH_URL = 'https://live-api-d.tradovate.com/v1/auth/accesstokenrequest';

export interface TradovateCredentials {
  username: string;
  password: string;
  cid: number;
  sec: string;
}

export interface TradovateAccount {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  netLiq: number;
  dayTradingBuyingPower: number;
}

export interface TradovateTrade {
  id: number;
  accountId: number;
  symbol: string;
  side: 'Buy' | 'Sell';
  quantity: number;
  price: number;
  timestamp: string;
  pnl: number;
  commission: number;
}

export class TradovateAPI {
  public accessToken: string | null = null;
  public refreshToken: string | null = null;

  async authenticate(credentials: TradovateCredentials): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const response = await fetch(TRADOVATE_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: credentials.username,
          password: credentials.password,
          appId: 'TradingJournalPro',
          appVersion: '1.0.0',
          cid: credentials.cid,
          sec: credentials.sec,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      console.error('Tradovate authentication error:', error);
      throw new Error('Failed to authenticate with Tradovate');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch(`${TRADOVATE_API_BASE}/auth/renewaccesstoken`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      
      return data.accessToken;
    } catch (error) {
      console.error('Tradovate token refresh error:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  async getAccounts(): Promise<TradovateAccount[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Tradovate');
    }

    try {
      const response = await fetch(`${TRADOVATE_API_BASE}/account/list`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      const accounts = await response.json();
      
      return accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        accountType: acc.accountType,
        balance: acc.balance,
        netLiq: acc.netLiq,
        dayTradingBuyingPower: acc.dayTradingBuyingPower,
      }));
    } catch (error) {
      console.error('Error fetching Tradovate accounts:', error);
      throw new Error('Failed to fetch accounts from Tradovate');
    }
  }

  async getTrades(accountId: number, startDate?: string, endDate?: string): Promise<TradovateTrade[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Tradovate');
    }

    try {
      let url = `${TRADOVATE_API_BASE}/fill/list?accountId=${accountId}`;
      
      if (startDate) url += `&startTimestamp=${startDate}`;
      if (endDate) url += `&endTimestamp=${endDate}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.statusText}`);
      }

      const fills = await response.json();
      
      return fills.map((fill: any) => ({
        id: fill.id,
        accountId: fill.accountId,
        symbol: fill.instrument.masterInstrument.name,
        side: fill.side,
        quantity: fill.qty,
        price: fill.price,
        timestamp: fill.timestamp,
        pnl: fill.realizedPnL || 0,
        commission: fill.commission || 0,
      }));
    } catch (error) {
      console.error('Error fetching Tradovate trades:', error);
      throw new Error('Failed to fetch trades from Tradovate');
    }
  }

  async syncAccountTrades(accountId: number): Promise<TradovateTrade[]> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return this.getTrades(
      accountId,
      thirtyDaysAgo.toISOString(),
      today.toISOString()
    );
  }
}

export const tradovateAPI = new TradovateAPI();