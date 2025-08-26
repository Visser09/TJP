import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import QuickActions from "@/components/quick-actions";
import MetricsGrid from "@/components/metrics-grid";
import TradingCalendar from "@/components/trading-calendar";
import AiInsights from "@/components/ai-insights";
import RecentTrades from "@/components/recent-trades";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
            <QuickActions />
            <MetricsGrid />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Trading Calendar */}
              <div className="lg:col-span-2">
                <TradingCalendar />
              </div>

              {/* AI Insights & Recent Trades */}
              <div className="space-y-6">
                <AiInsights />
                <RecentTrades />
              </div>
            </div>

            {/* Performance Chart Placeholder */}
            <div className="glass-morphism rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Performance Overview</h2>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-apple-blue/20 text-apple-blue rounded-lg text-sm font-medium" data-testid="button-chart-1d">
                    1D
                  </button>
                  <button className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors" data-testid="button-chart-1w">
                    1W
                  </button>
                  <button className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors" data-testid="button-chart-1m">
                    1M
                  </button>
                </div>
              </div>
              
              <div className="h-64 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl text-gray-600 mb-4">📈</div>
                  <p className="text-gray-400">Performance chart will be implemented here</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
