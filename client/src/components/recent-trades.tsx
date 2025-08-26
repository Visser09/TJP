import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

export default function RecentTrades() {
  const { toast } = useToast();

  const { data: trades, isLoading } = useQuery({
    queryKey: ["/api/trades/recent"],
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const formatPnL = (pnl: string | number) => {
    const value = parseFloat(pnl?.toString() || "0");
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toLocaleString()}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="glass-morphism rounded-2xl p-6" data-testid="recent-trades">
      <h3 className="text-lg font-semibold mb-4" data-testid="text-trades-title">Recent Trades</h3>
      
      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-700 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-700 rounded w-8 mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-12"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-700 rounded w-12 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-8"></div>
              </div>
            </div>
          ))
        ) : trades && trades.length > 0 ? (
          trades.map((trade: any) => {
            const pnlValue = parseFloat(trade.pnl || "0");
            const isProfit = pnlValue >= 0;
            
            return (
              <div 
                key={trade.id} 
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                data-testid={`trade-${trade.symbol}-${trade.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${isProfit ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <div>
                    <div className="font-medium text-sm" data-testid={`trade-symbol-${trade.id}`}>
                      {trade.symbol}
                    </div>
                    <div className="text-xs text-gray-400" data-testid={`trade-time-${trade.id}`}>
                      {formatTime(trade.entryTime)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div 
                    className={`text-sm font-medium ${isProfit ? 'text-green-400' : 'text-red-400'}`}
                    data-testid={`trade-pnl-${trade.id}`}
                  >
                    {formatPnL(trade.pnl)}
                  </div>
                  <div className="text-xs text-gray-400 capitalize" data-testid={`trade-side-${trade.id}`}>
                    {trade.side}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">📊</div>
            <p data-testid="text-no-trades">No recent trades</p>
            <p className="text-sm">Your trades will appear here</p>
          </div>
        )}
      </div>
      
      <button 
        className="w-full mt-4 text-apple-blue hover:text-blue-300 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
        data-testid="button-view-all-trades"
      >
        <span>View All Trades</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
