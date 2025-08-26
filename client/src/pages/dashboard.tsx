import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import QuickActions from "@/components/quick-actions";
import PerformanceChart from "@/components/performance-chart";
import MetricsGrid from "@/components/metrics-grid";
import TradingCalendar from "@/components/trading-calendar";
import AiInsights from "@/components/ai-insights";
import RecentTrades from "@/components/recent-trades";
import PropFirmSwitcher from "@/components/prop-firm-switcher";
import type { TradingAccount } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentAccount, setCurrentAccount] = useState<TradingAccount | null>(null);

  const { data: accounts = [] } = useQuery<TradingAccount[]>({
    queryKey: ['/api/trading-accounts'],
    enabled: isAuthenticated,
  });

  // Set first account as default
  useEffect(() => {
    if (accounts.length > 0 && !currentAccount) {
      setCurrentAccount(accounts[0]);
    }
  }, [accounts, currentAccount]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-20">
          <Header />
          <main className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <QuickActions 
                currentAccount={currentAccount}
                onSyncTrades={() => {
                  // Trigger sync from the current account's Tradovate connection
                  const syncButton = document.querySelector('[data-testid="button-sync-trades"]');
                  (syncButton as HTMLButtonElement)?.click();
                }}
              />
              <PropFirmSwitcher 
                currentAccount={currentAccount}
                onAccountChange={setCurrentAccount}
              />
            </div>
            <MetricsGrid currentAccount={currentAccount} />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Trading Calendar */}
              <div className="lg:col-span-2">
                <TradingCalendar currentAccount={currentAccount} />
              </div>

              {/* AI Insights & Recent Trades */}
              <div className="space-y-6">
                <AiInsights currentAccount={currentAccount} />
                <RecentTrades currentAccount={currentAccount} />
              </div>
            </div>

            {/* Performance Chart */}
            <PerformanceChart currentAccount={currentAccount} />
          </main>
        </div>
      </div>
    </div>
  );
}
