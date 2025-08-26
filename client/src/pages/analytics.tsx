import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

interface AnalyticsData {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
}

export default function Analytics() {
  const [timeframe, setTimeframe] = useState("1M");
  
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/performance', timeframe]
  });

  const { data: chartData = [] } = useQuery<any[]>({
    queryKey: ['/api/analytics/chart', timeframe]
  });

  const stats = [
    {
      name: "Total P&L",
      value: analytics ? `$${(analytics.totalPnl || 0).toFixed(2)}` : "$0.00",
      change: analytics?.totalPnl >= 0 ? "positive" : "negative",
      icon: DollarSign,
      testId: "stat-total-pnl"
    },
    {
      name: "Win Rate",
      value: analytics ? `${analytics.winRate.toFixed(1)}%` : "0.0%",
      change: analytics && analytics.winRate >= 50 ? "positive" : "negative",
      icon: TrendingUp,
      testId: "stat-win-rate"
    },
    {
      name: "Total Trades",
      value: analytics?.totalTrades?.toString() || "0",
      change: "neutral",
      icon: BarChart3,
      testId: "stat-total-trades"
    },
    {
      name: "Profit Factor",
      value: analytics ? analytics.profitFactor.toFixed(2) : "0.00",
      change: analytics && analytics.profitFactor >= 1 ? "positive" : "negative",
      icon: TrendingUp,
      testId: "stat-profit-factor"
    }
  ];

  const timeframes = [
    { label: "1D", value: "1D" },
    { label: "1W", value: "1W" },
    { label: "1M", value: "1M" },
    { label: "3M", value: "3M" },
    { label: "YTD", value: "YTD" }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="ml-20">
        <Header />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" data-testid="text-analytics-title">
                Trading Analytics
              </h1>
              <p className="text-gray-400" data-testid="text-analytics-subtitle">
                Comprehensive analysis of your trading performance
              </p>
            </div>

            {/* Timeframe Selector */}
            <div className="mb-8">
              <div className="flex space-x-2" data-testid="timeframe-selector">
                {timeframes.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      timeframe === tf.value
                        ? "bg-apple-blue text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                    }`}
                    data-testid={`button-timeframe-${tf.value}`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.name}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6"
                    data-testid={stat.testId}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">{stat.name}</p>
                        <p className={`text-2xl font-bold ${
                          stat.change === "positive" ? "text-green-400" :
                          stat.change === "negative" ? "text-red-400" : "text-white"
                        }`}>
                          {stat.value}
                        </p>
                      </div>
                      <Icon className={`w-8 h-8 ${
                        stat.change === "positive" ? "text-green-400" :
                        stat.change === "negative" ? "text-red-400" : "text-gray-400"
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Equity Curve */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4" data-testid="text-equity-curve-title">
                  Equity Curve
                </h3>
                <div className="h-64" data-testid="chart-equity-curve">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trade Distribution */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4" data-testid="text-trade-distribution-title">
                  Trade Distribution
                </h3>
                <div className="h-64" data-testid="chart-trade-distribution">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="trades" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            {analytics && (
              <div className="mt-8 bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-4" data-testid="text-detailed-stats-title">
                  Detailed Statistics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm">Average Win</p>
                    <p className="text-xl font-semibold text-green-400" data-testid="text-avg-win">
                      ${analytics.avgWin.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Average Loss</p>
                    <p className="text-xl font-semibold text-red-400" data-testid="text-avg-loss">
                      ${Math.abs(analytics.avgLoss).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Max Drawdown</p>
                    <p className="text-xl font-semibold text-red-400" data-testid="text-max-drawdown">
                      ${Math.abs(analytics.maxDrawdown).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-blue mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading analytics...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}